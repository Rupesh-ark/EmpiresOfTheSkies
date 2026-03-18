import { INVALID_MOVE } from "boardgame.io/core";
import type { Ctx } from "boardgame.io";
import { createLogger } from "./logger";
import { MyGameState } from "../types";
import { logEvent } from "./stateUtils";
import { BuildingSlot } from "../codifiedGameInfo";

const log = createLogger("move");

// ── Game log formatters (for player-visible game log) ───────────────────────

const BUILDING_NAMES: Record<number, string> = {
  [BuildingSlot.Cathedral]: "Cathedral",
  [BuildingSlot.Palace]: "Palace",
  [BuildingSlot.Shipyard]: "Shipyard",
  [BuildingSlot.Fort]: "Fort",
};

/**
 * Formatters for the player-visible game log. Called AFTER a successful move.
 * Returns a string to push to G.gameLog, or null to skip logging.
 * Only action-phase moves are listed — events, battles, discovery etc.
 * already have their own logEvent calls inside their move functions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LOG_FORMATTERS: Record<string, (G: MyGameState, playerID: string, ...args: any[]) => string | null> = {
  recruitCounsellors: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].resources.counsellors;
    return `${k} recruits a Counsellor (now ${count})`;
  },
  recruitRegiments: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].resources.regiments;
    return `${k} recruits Regiments (now ${count})`;
  },
  purchaseSkyships: (G, pid, _slot, republic) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].resources.skyships;
    return `${k} purchases Skyships from ${republic} (now ${count})`;
  },
  buildSkyships: (G, pid, perShipyard) => {
    const k = G.playerInfo[pid].kingdomName;
    const built = perShipyard * G.playerInfo[pid].shipyards;
    return `${k} builds ${built} Skyship(s)`;
  },
  conscriptLevies: (G, pid, levyAmount) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} conscripts ${levyAmount} Levies`;
  },
  trainTroops: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} trains troops (draws 2 FoW cards)`;
  },
  deployFleet: (G, pid, _fleetIndex, dest, sky, reg, lev) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} dispatches fleet to [${dest}] (${sky}S, ${reg}R, ${lev}L)`;
  },
  foundBuildings: (G, pid, slotIndex) => {
    const k = G.playerInfo[pid].kingdomName;
    const building = BUILDING_NAMES[slotIndex + 1] ?? "building";
    return `${k} founds a ${building}`;
  },
  foundFactory: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].factories;
    return `${k} founds a Factory (now ${count})`;
  },
  influencePrelates: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} influences Prelates`;
  },
  punishDissenters: (G, pid, _slot, paymentType) => {
    const k = G.playerInfo[pid].kingdomName;
    if (paymentType === "execute") return `${k} executes a prisoner`;
    return `${k} punishes Dissenters (pays ${paymentType})`;
  },
  convertMonarch: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const alignment = G.playerInfo[pid].hereticOrOrthodox;
    return `${k} converts Monarch (now ${alignment})`;
  },
  alterPlayerOrder: (G, pid, newPosition) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} changes to player order position ${newPosition + 1}`;
  },
  pass: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} passes`;
  },
  issueHolyDecree: (G, pid, decreeType) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} issues Holy Decree: ${decreeType}`;
  },
};

// ── Move wrapper ────────────────────────────────────────────────────────────

/**
 * Wraps a boardgame.io move function with:
 * 1. Structured developer logging (console JSON)
 * 2. Player-visible game log entries for successful action-phase moves
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withLogging = (name: string, moveFn: any): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (context: any, ...args: any[]) => {
    const { G, playerID, ctx } = context;
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
    } else {
      // Move succeeded — write to player-visible game log if formatter exists
      const formatter = LOG_FORMATTERS[name];
      if (formatter) {
        const message = formatter(G, playerID, ...args);
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
