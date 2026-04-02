/**
 * V2 Evaluator: recruitRegiments
 *
 * Hire 4 regiments. Cost: 2-7g depending on slot.
 * Regiments are needed for conquest garrisons and ground combat.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { getBase } from "../archetypes";
import { goldPressure, goldPressureReason, personalityBonus, roundAwareness, diminishingReturns } from "../common";

const REGIMENT_PERSONALITY = {
  kaCards: ["elite_regiments", "improved_training"],
  legacyCards: ["the mighty", "the conqueror"],
  kaBonus: 0.12,
  legacyBonus: 0.08,
};

function getSlotCost(slotIndex: number): number {
  return 2 + slotIndex; // slot 0 = 2g, slot 5 = 7g
}

export function evaluateRecruitRegiments(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const slotIndex = (move.args[0] as number) ?? 0;
  const cost = getSlotCost(slotIndex);
  const gold = player.resources.gold;
  const regiments = player.resources.regiments;
  const activeFleets = player.fleetInfo.filter(f => f.skyships > 0).length;

  let quality = getBase(personality.baseQualities, "recruitRegiments");
  const reasons: string[] = [];

  // Regiments are useful if you have fleets to load them onto
  if (activeFleets > 0 && regiments < 4) {
    quality += V2_CONFIG.bonuses.lowTroops;
    reasons.push("low troops with active fleets");
  } else if (G.round <= 3 && regiments < 4) {
    // Early game: building up army even without fleets yet is fine
    quality += V2_CONFIG.bonuses.lowTroops * 0.5;
    reasons.push("early game buildup");
  }

  // No fleets = regiments sit idle — but only penalize after round 2
  // (round 1-2 you're still building infrastructure)
  if (activeFleets === 0 && player.resources.skyships === 0 && G.round > 2) {
    quality -= V2_CONFIG.bonuses.noFleetsOrSkyships * V2_CONFIG.penaltyScale;
    reasons.push("no fleets or skyships (mid/late game)");
  }

  // Diminishing returns on regiment stockpile
  const dim = diminishingReturns(Math.floor(regiments / 4), 0.05, 5); // per batch of 4
  quality -= dim.penalty;
  if (dim.reason) reasons.push(dim.reason);

  // Gold pressure
  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  // Round awareness — mid-game investment
  const ra = roundAwareness(G.round, G.finalRound, "mid");
  quality += ra.modifier;
  if (ra.reason) reasons.push(ra.reason);

  // Personality
  const pb = personalityBonus(personality, REGIMENT_PERSONALITY);
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `slot ${slotIndex}, cost ${cost}g, have ${regiments} regs, ${activeFleets} fleets. ${reasons.join(", ")}`,
  };
}
