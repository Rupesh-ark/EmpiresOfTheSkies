import { INVALID_MOVE } from "boardgame.io/core";
import { createLogger } from "./logger";

const log = createLogger("move");

/**
 * Wraps a boardgame.io move function with structured logging.
 * Logs move name, playerID, phase, turn number, and args on entry.
 * Logs a warning if the move returns INVALID_MOVE.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withLogging = (name: string, moveFn: any): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (context: any, ...args: any[]) => {
    const { playerID, ctx } = context;
    log.info(name, {
      playerID,
      phase: ctx.phase,
      turn: ctx.turn,
      ...(args.length > 0 && { args }),
    });

    const result = moveFn(context, ...args);

    if (result === INVALID_MOVE) {
      log.warn(`${name} REJECTED`, {
        playerID,
        phase: ctx.phase,
        ...(args.length > 0 && { args }),
      });
    }

    return result;
  };
};
