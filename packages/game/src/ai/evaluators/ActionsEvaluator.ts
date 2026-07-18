/**
 * V2 Actions Phase Evaluator
 *
 * Orchestrates per-move evaluators for the actions phase.
 * Each move evaluates itself independently. Viable moves are passed forward.
 * Viable moves are selected randomly until MCTS is implemented.
 */
import type { MyGameState } from "../../types.js";
import type { AIMove } from "../types.js";
import type { MoveEval, MoveEvaluator, BotPersonality } from "./types.js";
import { V2_CONFIG } from "./config.js";

// Import all evaluators
import { evaluateFoundBuildings } from "./actions/foundBuildings.js";
import { evaluateInfluencePrelates } from "./actions/influencePrelates.js";
import { evaluateDeployFleet } from "./actions/deployFleet.js";
import { evaluatePurchaseSkyships } from "./actions/purchaseSkyships.js";
import { evaluateRecruitCounsellors } from "./actions/recruitCounsellors.js";
import { evaluateRecruitRegiments } from "./actions/recruitRegiments.js";
import { evaluateTrainTroops } from "./actions/trainTroops.js";
import { evaluateFoundFactory } from "./actions/foundFactory.js";
import { evaluateSendAgitators } from "./actions/sendAgitators.js";
import {
  evaluatePunishDissenters,
  evaluateGarrisonTransfer,
  evaluateMoveFleet,
  evaluateBuildSkyships,
  evaluateConscriptLevies,
  evaluateConvertMonarch,
  evaluateAlterPlayerOrder,
  evaluateDeclareSmugglerGood,
  evaluateCheckAndPlaceFort,
  evaluateIssueHolyDecree,
  evaluateTransferBetweenFleets,
  evaluateTransferOutpost,
  evaluatePass,
  evaluateConfirmAction,
  evaluateDiscardFoWCard,
  evaluateSellSkyships,
  evaluateSellBuilding,
} from "./actions/misc.js";

// Move evaluator registry

const evaluatorRegistry = new Map<string, MoveEvaluator>();

/** Register an evaluator for a move type */
export function registerEvaluator(moveName: string, evaluator: MoveEvaluator): void {
  evaluatorRegistry.set(moveName, evaluator);
}

// Register all known evaluators

registerEvaluator("foundBuildings", evaluateFoundBuildings);
registerEvaluator("influencePrelates", evaluateInfluencePrelates);
registerEvaluator("deployFleet", evaluateDeployFleet);
registerEvaluator("purchaseSkyships", evaluatePurchaseSkyships);
registerEvaluator("recruitCounsellors", evaluateRecruitCounsellors);
registerEvaluator("recruitRegiments", evaluateRecruitRegiments);
registerEvaluator("trainTroops", evaluateTrainTroops);
registerEvaluator("foundFactory", evaluateFoundFactory);
registerEvaluator("sendAgitators", evaluateSendAgitators);
registerEvaluator("punishDissenters", evaluatePunishDissenters);
registerEvaluator("garrisonTransfer", evaluateGarrisonTransfer);
registerEvaluator("moveFleet", evaluateMoveFleet);
registerEvaluator("buildSkyships", evaluateBuildSkyships);
registerEvaluator("conscriptLevies", evaluateConscriptLevies);
registerEvaluator("convertMonarch", evaluateConvertMonarch);
registerEvaluator("alterPlayerOrder", evaluateAlterPlayerOrder);
registerEvaluator("sellSkyships", evaluateSellSkyships);
registerEvaluator("sellBuilding", evaluateSellBuilding);
registerEvaluator("declareSmugglerGood", evaluateDeclareSmugglerGood);
registerEvaluator("checkAndPlaceFort", evaluateCheckAndPlaceFort);
registerEvaluator("issueHolyDecree", evaluateIssueHolyDecree);
registerEvaluator("transferBetweenFleets", evaluateTransferBetweenFleets);
registerEvaluator("transferOutpost", evaluateTransferOutpost);
registerEvaluator("pass", evaluatePass);
registerEvaluator("confirmAction", evaluateConfirmAction);
registerEvaluator("discardFoWCard", evaluateDiscardFoWCard);

// Default evaluator for unregistered moves

function defaultEvaluator(
  _G: MyGameState,
  _playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  return {
    move,
    viable: true,
    quality: 0.3,
    reason: "no evaluator registered (default)",
  };
}

// Main evaluation function

export interface EvaluationResult {
  viable: MoveEval[];
  filtered: MoveEval[];
}

/**
 * Evaluate all legal moves for the actions phase.
 * Returns viable moves (above threshold) and filtered moves (below threshold).
 * Groups moves by type and keeps top N per group to prevent flooding
 * (e.g., 100+ deployFleet variants).
 */
export function evaluateActions(
  G: MyGameState,
  playerID: string,
  moves: AIMove[],
  personality: BotPersonality,
): EvaluationResult {
  const allViable: MoveEval[] = [];
  const filtered: MoveEval[] = [];

  for (const move of moves) {
    const evaluator = evaluatorRegistry.get(move.move) ?? defaultEvaluator;
    const result = evaluator(G, playerID, move, personality);

    if (result.quality >= V2_CONFIG.qualityThreshold && result.viable) {
      allViable.push(result);
    } else {
      filtered.push({ ...result, viable: false });
    }
  }

  // Deduplicate and cap viable moves to keep the set manageable.
  // For deployFleet/moveFleet: group by destination, keep best loadout per dest, cap at N dests.
  // For other move types: keep top N per type.
  const MAX_DESTINATIONS = V2_CONFIG.grouping.maxDestinations;
  const MAX_PER_TYPE = V2_CONFIG.grouping.maxPerType;

  const deployMoves: MoveEval[] = [];
  const otherByType = new Map<string, MoveEval[]>();

  for (const v of allViable) {
    if (v.move.move === "deployFleet" || v.move.move === "moveFleet") {
      deployMoves.push(v);
    } else {
      const group = otherByType.get(v.move.move) ?? [];
      group.push(v);
      otherByType.set(v.move.move, group);
    }
  }

  const viable: MoveEval[] = [];

  // Deduplicate deploy/move by destination — keep best loadout per dest
  if (deployMoves.length > 0) {
    const byDest = new Map<string, MoveEval>();
    for (const d of deployMoves) {
      const dest = d.move.args[1] as [number, number] | undefined;
      const key = dest ? `${dest[0]},${dest[1]}` : "home";
      const existing = byDest.get(key);
      if (!existing || d.quality > existing.quality) {
        if (existing) {
          filtered.push({ ...existing, viable: false, reason: existing.reason + " (better loadout exists)" });
        }
        byDest.set(key, d);
      } else {
        filtered.push({ ...d, viable: false, reason: d.reason + " (better loadout exists)" });
      }
    }
    // Keep top N destinations by quality
    const destsSorted = [...byDest.values()].sort((a, b) => b.quality - a.quality);
    viable.push(...destsSorted.slice(0, MAX_DESTINATIONS));
    for (const excess of destsSorted.slice(MAX_DESTINATIONS)) {
      filtered.push({ ...excess, viable: false, reason: excess.reason + " (dest capped)" });
    }
  }

  // Other move types: keep best variant per type.
  // Most slot-based actions (recruitRegiments, recruitCounsellors, purchaseSkyships,
  // influencePrelates, foundBuildings, etc.) have multiple slots but you can only
  // do one per turn. Keep the highest quality variant per move type.
  // Exception: foundBuildings has 4 different building types (cathedral, palace,
  // shipyard, fort) — dedupe by slot arg (building type).
  const MULTI_BUILDING_TYPES = new Set(["foundBuildings"]);

  for (const [moveName, group] of otherByType) {
    group.sort((a, b) => b.quality - a.quality);

    if (MULTI_BUILDING_TYPES.has(moveName)) {
      // foundBuildings: keep best per building type (arg[0] = slot 0-3)
      const bySlot = new Map<number, MoveEval>();
      for (const m of group) {
        const slot = m.move.args[0] as number;
        if (!bySlot.has(slot) || m.quality > (bySlot.get(slot)!.quality)) {
          const prev = bySlot.get(slot);
          if (prev) filtered.push({ ...prev, viable: false, reason: prev.reason + " (better slot)" });
          bySlot.set(slot, m);
        } else {
          filtered.push({ ...m, viable: false, reason: m.reason + " (better slot)" });
        }
      }
      viable.push(...bySlot.values());
    } else {
      // All other types: keep only the best variant
      viable.push(group[0]);
      for (const excess of group.slice(1)) {
        filtered.push({ ...excess, viable: false, reason: excess.reason + " (best variant kept)" });
      }
    }
  }

  return { viable, filtered };
}

/**
 * Pick a move from the viable set.
 * Random selection until MCTS is implemented.
 */
export function pickMove(viable: MoveEval[]): MoveEval | null {
  if (viable.length === 0) return null;
  const idx = Math.floor(Math.random() * viable.length);
  return viable[idx];
}
