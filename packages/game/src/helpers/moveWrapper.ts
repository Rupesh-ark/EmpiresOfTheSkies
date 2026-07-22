import { INVALID_MOVE, Invalid } from "boardgame.io/core";
import log from "./logger.js";
import { MyGameState, MoveDefinition } from "../types.js";
import { logEvent } from "./stateUtils.js";
import { getMoveObserver } from "../recorder.js";

const moveLog = log.child({ mod: "move" });

// Move wrapper

/**
 * Wraps a MoveDefinition into a boardgame.io move function with:
 * 1. Server-authoritative validation (returns Invalid(error) on failure;
 *    boardgame.io delivers the error to the acting client, which toasts it)
 * 2. Structured developer logging (console JSON)
 * 3. Player-visible game log entries for successful moves
 *
 * Pipeline: dev log → validate? → fn → successLog
 */
const lastLogKeys = new WeakMap<MyGameState, string>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wrapMove = (name: string, def: MoveDefinition): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (context: any, ...args: any[]) => {
    const { G, playerID, ctx } = context;

    const logKey = `${ctx.turn}:${name}:${playerID}`;
    const lastLogKey = lastLogKeys.get(G) ?? "";
    if (logKey !== lastLogKey) {
      lastLogKeys.set(G, logKey);
      moveLog.debug({
        playerID,
        phase: ctx.phase,
        turn: ctx.turn,
      }, name);
    }

    // Server-authoritative validation — the single source of truth.
    if (def.validate) {
      const error = def.validate(G, playerID, ...args);
      if (error) {
        moveLog.warn({
          playerID,
          error: error.message,
        }, `${name} REJECTED (validate)`);
        return Invalid(error);
      }
    }

    // Run the move
    const result = def.fn(context, ...args);

    if (result === INVALID_MOVE) {
      moveLog.warn({
        playerID,
        phase: ctx.phase,
      }, `${name} REJECTED`);
      return Invalid({
        code: "INVALID_MOVE",
        message: def.errorMessage,
      });
    } else {
      if (def.successLog) {
        const message = def.successLog(G, playerID, ...args);
        if (message) {
          logEvent(G, message);
        }
      }
      const obs = getMoveObserver();
      if (obs) {
        obs.recordMove(name, playerID, args, G, ctx);
      }
    }

    return result;
  };
};
