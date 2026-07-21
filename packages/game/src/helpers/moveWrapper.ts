import { INVALID_MOVE, Invalid } from "boardgame.io/core";
import type { Ctx } from "boardgame.io";
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

// Phase onBegin wrappers

const LOOP_GUARD_LIMIT = 200;
const circuitLog = log.child({ mod: "circuit-breaker" });

/**
 * Minimal shape of a boardgame.io onBegin context that we need for guarding.
 * boardgame.io does not export a standalone OnBeginContext type, so we declare
 * only the fields we actually touch.
 */
type PhaseContext = {
  G: MyGameState;
  ctx: Ctx;
};

/**
 * Wraps a phase `onBegin` callback with the circuit-breaker loop guard.
 * On every entry it increments `G._loopGuard`. When the count exceeds
 * LOOP_GUARD_LIMIT the game is halted and the callback is skipped.
 *
 * Use this for every phase except `discovery` (use `withPhaseReset` there).
 */
export function checkLoopGuard(context: PhaseContext, phaseName: string): boolean {
  if (context.G._halted) return true;
  context.G._loopGuard++;
  if (context.G._loopGuard > LOOP_GUARD_LIMIT) {
    circuitLog.error({
      phase: phaseName,
      loopCount: context.G._loopGuard as unknown as number,
      round: context.G.round as unknown as number,
      turn: context.ctx.turn as unknown as number,
      G: context.G as unknown as Record<string, unknown>,
    }, `CIRCUIT BREAKER TRIPPED in phase "${phaseName}"`);
    context.G._halted = true;
    return true;
  }
  return false;
}

export const withPhaseGuard = <C extends PhaseContext>(
  phaseName: string,
  fn: (context: C) => void,
): ((context: C) => void) => {
  return (context: C) => {
    if (context.G._halted) return;
    context.G._loopGuard++;
    if (context.G._loopGuard > LOOP_GUARD_LIMIT) {
      circuitLog.error({
        phase: phaseName,
        loopCount: context.G._loopGuard as unknown as number,
        round: context.G.round as unknown as number,
        turn: context.ctx.turn as unknown as number,
      }, `CIRCUIT BREAKER TRIPPED in phase "${phaseName}"`);
      context.G._halted = true;
      return;
    }
    fn(context);
  };
};

/**
 * Variant for the `discovery` phase onBegin — the round boundary.
 * Resets `_loopGuard` to 0 and clears `_halted` BEFORE incrementing, so each
 * new round gets a fresh budget. The increment still counts this call itself.
 */
export const withPhaseReset = <C extends PhaseContext>(
  phaseName: string,
  fn: (context: C) => void,
): ((context: C) => void) => {
  return (context: C) => {
    context.G._loopGuard = 0;
    context.G._halted = false;
    context.G._loopGuard++;          // count this call (should always be 1)
    if (context.G._loopGuard > LOOP_GUARD_LIMIT) {
      // Extremely unlikely, but keeps the logic symmetric
      circuitLog.error({
        phase: phaseName,
        loopCount: context.G._loopGuard as unknown as number,
        round: context.G.round as unknown as number,
        turn: context.ctx.turn as unknown as number,
      }, `CIRCUIT BREAKER TRIPPED in phase "${phaseName}"`);
      context.G._halted = true;
      return;
    }
    fn(context);
  };
};
