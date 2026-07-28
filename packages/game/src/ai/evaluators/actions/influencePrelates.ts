/**
 * V2 Evaluator: influencePrelates
 *
 * Evaluates whether influencing a prelate slot is reasonable.
 * 8 slots: 6 kingdom slots (one per player) + 2 neutral (republic) slots.
 * Cost: own slot = 0g, rival slot = their cathedral count, neutral = 1g.
 * Always costs 1 counsellor.
 */
import type { MyGameState } from "../../../types.js";
import type { AIMove } from "../../types.js";
import type { MoveEval, BotPersonality } from "../types.js";
import { V2_CONFIG } from "../config.js";
import { getBase } from "../archetypes.js";
import { goldPressure, goldPressureReason, personalityBonus, roundAwareness, diminishingReturns } from "../common.js";
import { getInfluencePrelateCost } from "../../../helpers/actionCosts.js";
import { PlayerColour } from "../../../types.js";

// Slot → kingdom colour mapping
const SLOT_TO_COLOUR: Record<number, string | null> = {
  1: PlayerColour.red,    // Angland
  2: PlayerColour.blue,   // Gallois
  3: PlayerColour.yellow, // Normark
  4: null,                // Zeeland (republic)
  5: null,                // Venoa (republic)
  6: PlayerColour.brown,  // Castillia
  7: PlayerColour.white,  // Ostreich
  8: PlayerColour.green,  // Constantium
};

const INFLUENCE_PERSONALITY = {
  kaCards: ["patriarch_of_the_church", "more_prisons"],
  legacyCards: ["the pious", "the magnificent"],
  kaBonus: 0.12,
  legacyBonus: 0.08,
};

function isOwnSlot(G: MyGameState, playerID: string, slotIndex: number): boolean {
  const boardSlot = slotIndex + 1;
  const slotColour = SLOT_TO_COLOUR[boardSlot];
  return slotColour !== null && slotColour === G.playerInfo[playerID].colour;
}

function isRepublicSlot(slotIndex: number): boolean {
  const boardSlot = slotIndex + 1;
  return boardSlot === 4 || boardSlot === 5;
}

function countSlotsTakenByPlayer(G: MyGameState, playerID: string): number {
  let count = 0;
  for (const occupant of Object.values(G.boardState.influencePrelates)) {
    if (occupant === playerID) count++;
  }
  return count;
}

export function evaluateInfluencePrelates(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const slotIndex = move.args[0] as number;
  const cost = getInfluencePrelateCost(G, playerID, slotIndex + 1).cost;
  const gold = player.resources.gold;
  const slotsTaken = countSlotsTakenByPlayer(G, playerID);

  let quality = getBase(personality.baseQualities, "influencePrelates");
  const reasons: string[] = [];

  // Slot type
  if (isOwnSlot(G, playerID, slotIndex)) {
    quality += V2_CONFIG.bonuses.ownSlotBonus;
    reasons.push("own slot (free)");
  } else if (isRepublicSlot(slotIndex)) {
    quality += V2_CONFIG.bonuses.republicSlotBonus;
    reasons.push("republic slot");
  } else {
    // Rival slot — the bribe is paid to the bank
    if (cost >= 3) {
      quality -= V2_CONFIG.bonuses.rivalSlotHighPenalty * V2_CONFIG.penaltyScale;
      reasons.push(`rival slot costs ${cost}g`);
    } else if (cost >= 1) {
      quality -= V2_CONFIG.bonuses.rivalSlotLowPenalty * V2_CONFIG.penaltyScale;
      reasons.push(`rival slot costs ${cost}g`);
    } else {
      reasons.push("rival slot (free)");
    }
  }

  // Gold pressure (from common)
  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  // Counsellor drain as diminishing returns
  // Each slot burns a counsellor. Use flow-based diminishing (slots this round).
  const dim = diminishingReturns(slotsTaken, 0.1, 4);
  quality -= dim.penalty;
  if (dim.reason) reasons.push(dim.reason);

  // Round awareness (from common)
  const ra = roundAwareness(G.round, G.finalRound, "mid");
  quality += ra.modifier;
  if (ra.reason) reasons.push(ra.reason);

  // Personality (from common)
  const pb = personalityBonus(personality, INFLUENCE_PERSONALITY);
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  // Clamp and return
  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `slot ${slotIndex + 1}, cost ${cost}g, goldAfter ${gold - cost}. ${reasons.join(", ")}`,
  };
}
