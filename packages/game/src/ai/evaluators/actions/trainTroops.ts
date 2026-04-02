/**
 * V2 Evaluator: trainTroops
 *
 * Free action: draw 2 Fortune of War cards (keep hand limit of 4).
 * No gold cost. Gives combat cards for battles.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { getBase } from "../archetypes";
import { personalityBonus } from "../common";

const TRAIN_PERSONALITY = {
  kaCards: ["improved_training", "elite_regiments"],
  legacyCards: ["the mighty", "the conqueror", "the aviator"],
  kaBonus: 0.06,
  legacyBonus: 0.05,
};

export function evaluateTrainTroops(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const fowCards = player.resources.fortuneCards?.length ?? 0;

  let quality = getBase(personality.baseQualities, "trainTroops");
  const reasons: string[] = [];

  // Free action — always somewhat viable
  // But value depends on hand size: if you already have 4 cards, drawing forces discard
  if (fowCards >= 4) {
    quality -= V2_CONFIG.bonuses.fowHandFullPenalty * V2_CONFIG.penaltyScale;
    reasons.push("hand full (will discard)");
  } else if (fowCards <= 1) {
    quality += V2_CONFIG.bonuses.fowHandLowBonus;
    reasons.push("low FoW cards");
  }

  // More useful if you have active fleets (might fight)
  const activeFleets = player.fleetInfo.filter(f => f.skyships > 0).length;
  if (activeFleets > 0) {
    quality += V2_CONFIG.bonuses.activeFleetTrainBonus;
    reasons.push("has active fleets");
  } else {
    quality -= V2_CONFIG.bonuses.noActiveFleetsPenalty * V2_CONFIG.penaltyScale;
    reasons.push("no active fleets");
  }

  // Personality
  const pb = personalityBonus(personality, TRAIN_PERSONALITY);
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `FoW hand: ${fowCards}, fleets: ${activeFleets}. ${reasons.join(", ")}`,
  };
}
