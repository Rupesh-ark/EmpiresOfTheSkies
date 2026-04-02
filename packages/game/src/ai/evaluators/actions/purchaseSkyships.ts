/**
 * V2 Evaluator: purchaseSkyships
 *
 * Buy 2 skyships from a republic. Cost: 3-4g depending on slot.
 * Skyships are the foundation — needed for fleets, routes, combat.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { getBase } from "../archetypes";
import { goldPressure, goldPressureReason, personalityBonus, roundAwareness, diminishingReturns } from "../common";
import { countActiveTradeRoutes } from "../../../helpers/mapUtils";

const SKYSHIP_PERSONALITY = {
  kaCards: ["sanctioned_piracy"],
  legacyCards: ["the aviator", "the navigator", "the conqueror"],
  kaBonus: 0.08,
  legacyBonus: 0.06,
};

function getSlotCost(slotIndex: number): number {
  return 3 + slotIndex; // slot 0 = 3g, slot 1 = 4g
}

export function evaluatePurchaseSkyships(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const slotIndex = (move.args[0] as number) ?? 0;
  const cost = getSlotCost(slotIndex);
  const gold = player.resources.gold;
  const currentSkyships = player.resources.skyships;

  let quality = getBase(personality.baseQualities, "purchaseSkyships");
  const reasons: string[] = [];

  // Skyships are critical early — you need them for everything
  if (currentSkyships < 2) {
    quality += V2_CONFIG.bonuses.lowSkyships;
    reasons.push("low skyships");
  } else if (currentSkyships < 4) {
    quality += V2_CONFIG.bonuses.lowSkyshipsBonus;
  }

  // Routes need skyships — if we have territory but no routes, skyships are critical
  let outpostCount = 0;
  for (let sy = 0; sy < G.mapState.buildings.length; sy++) {
    for (let sx = 0; sx < G.mapState.buildings[sy].length; sx++) {
      const b = G.mapState.buildings[sy][sx];
      if (b.player?.id === playerID && (b.buildings === "outpost" || b.buildings === "colony")) {
        outpostCount++;
      }
    }
  }
  const routes = countActiveTradeRoutes(G, playerID);
  if (outpostCount > 0 && routes === 0) {
    quality += V2_CONFIG.bonuses.noRoutesUrgency;
    reasons.push("have territory but no routes — need skyships for chain");
  }

  // Diminishing returns — 8+ skyships is excessive
  const dim = diminishingReturns(currentSkyships, 0.04, 8);
  quality -= dim.penalty;
  if (dim.reason) reasons.push(dim.reason);

  // Gold pressure
  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  // Round awareness — early investment
  const ra = roundAwareness(G.round, G.finalRound, "early");
  quality += ra.modifier;
  if (ra.reason) reasons.push(ra.reason);

  const pb = personalityBonus(personality, SKYSHIP_PERSONALITY);
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `slot ${slotIndex}, cost ${cost}g, have ${currentSkyships} sky. ${reasons.join(", ")}`,
  };
}
