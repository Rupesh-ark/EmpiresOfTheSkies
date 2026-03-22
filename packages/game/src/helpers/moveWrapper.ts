import { INVALID_MOVE } from "boardgame.io/core";
import type { Ctx } from "boardgame.io";
import { createLogger } from "./logger";
import { MyGameState, MoveDefinition } from "../types";
import { logEvent } from "./stateUtils";

const log = createLogger("move");
const stageLog = createLogger("stage-desync");

// ── Stage ↔ Phase validation ────────────────────────────────────────────────

/**
 * Maps each ctx.phase to the set of G.stage values that are valid within it.
 * Used by the debug assertion in wrapMove to catch stage/phase desyncs during
 * playtesting. See docs/STAGE_PHASE_MAP.md for full documentation.
 */
const VALID_STAGES: Record<string, Set<string>> = {
  kingdom_advantage: new Set(["discovery", "reset"]),         // onBegin doesn't set G.stage; inherits from setup or reset
  legacy_card:       new Set(["pick legacy card"]),
  events:            new Set(["events"]),
  discovery:         new Set(["discovery"]),
  taxes:             new Set(["taxes"]),
  actions:           new Set(["actions", "confirm_fow_draw", "discard_fow", "attack or pass"]),
  aerial_battle:     new Set(["attack or pass", "attack or evade", "resolve battle", "relocate loser"]),
  plunder_legends:   new Set(["plunder legends", "attack or pass"]),
  ground_battle:     new Set(["attack or pass", "defend or yield", "resolve battle", "garrison troops", "relocate loser", "conquest"]),
  conquest:          new Set(["attack or pass", "conquest", "conquest draw or pick card", "garrison troops", "election"]),
  election:          new Set(["election", "attack or pass", "conquest"]),  // election onBegin doesn't set G.stage; inherits from conquest exit
  resolution:        new Set(["infidel_fleet_combat", "deferred_battle", "rebellion", "rebellion_rival_support", "invasion_nominate", "invasion_contribute", "invasion_buyoff", "retrieve fleets"]),
  reset:             new Set(["reset", "retrieve fleets"]),   // onBegin doesn't set G.stage; inherits from resolution exit
};

const checkStagePhaseSync = (G: MyGameState, ctx: { phase?: string | null }, moveName: string) => {
  const phase = ctx.phase;
  if (!phase) return;
  const validStages = VALID_STAGES[phase];
  if (!validStages) return;  // unknown phase — skip check
  if (!validStages.has(G.stage)) {
    stageLog.error(`STAGE/PHASE DESYNC in move "${moveName}"`, {
      move: moveName,
      phase,
      stage: G.stage,
      expected: [...validStages],
      round: G.round,
    });
  }
};

// ── Move wrapper ────────────────────────────────────────────────────────────

/**
 * Wraps a MoveDefinition into a boardgame.io move function with:
 * 1. Server-side validation safety net (returns INVALID_MOVE on failure)
 * 2. Structured developer logging (console JSON)
 * 3. Player-visible game log entries for successful moves
 *
 * Note: Error feedback to the player is handled client-side — the frontend
 * calls validate() before invoking the move. See docs/TOAST_SYSTEM.md.
 *
 * Pipeline: dev log → validate? → fn → successLog
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wrapMove = (name: string, def: MoveDefinition): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (context: any, ...args: any[]) => {
    const { G, playerID, ctx } = context;

    log.info(name, {
      playerID,
      phase: ctx.phase,
      turn: ctx.turn,
      ...(args.length > 0 && { args }),
    });

    // Debug: catch G.stage / ctx.phase desyncs early
    checkStagePhaseSync(G, ctx, name);

    // Server-side validation safety net
    if (def.validate) {
      const error = def.validate(G, playerID, ...args);
      if (error) {
        log.warn(`${name} REJECTED (validate)`, {
          playerID,
          error: error.message,
        });
        return INVALID_MOVE;
      }
    }

    // Run the move
    const result = def.fn(context, ...args);

    if (result === INVALID_MOVE) {
      log.warn(`${name} REJECTED`, {
        playerID,
        phase: ctx.phase,
        ...(args.length > 0 && { args }),
      });
    } else {
      // Move succeeded — log to game log if formatter exists
      if (def.successLog) {
        const message = def.successLog(G, playerID, ...args);
        if (message) {
          logEvent(G, message);
        }
      }
    }

    return result;
  };
};

// ── Phase onBegin wrappers ───────────────────────────────────────────────────

const LOOP_GUARD_LIMIT = 200;
const circuitLog = createLogger("circuit-breaker");

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
    circuitLog.error(`CIRCUIT BREAKER TRIPPED in phase "${phaseName}"`, {
      phase: phaseName,
      loopCount: context.G._loopGuard as unknown as number,
      round: context.G.round as unknown as number,
      turn: context.ctx.turn as unknown as number,
      G: context.G as unknown as Record<string, unknown>,
    });
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
      circuitLog.error(`CIRCUIT BREAKER TRIPPED in phase "${phaseName}"`, {
        phase: phaseName,
        loopCount: context.G._loopGuard as unknown as number,
        round: context.G.round as unknown as number,
        turn: context.ctx.turn as unknown as number,
      });
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
      circuitLog.error(`CIRCUIT BREAKER TRIPPED in phase "${phaseName}"`, {
        phase: phaseName,
        loopCount: context.G._loopGuard as unknown as number,
        round: context.G.round as unknown as number,
        turn: context.ctx.turn as unknown as number,
      });
      context.G._halted = true;
      return;
    }
    fn(context);
  };
};
