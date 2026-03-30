/**
 * V2 Evaluator: recruitCounsellors
 *
 * Hire an additional counsellor. Cost: 1-2g depending on slot.
 * More counsellors = more actions per round (compound value).
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { goldPressure, goldPressureReason, roundAwareness, diminishingReturns } from "../common";
import { MAX_COUNSELLORS } from "../../../data/gameData";

function getSlotCost(slotIndex: number): number {
  // Slots 0,1 = 1g; slot 2 = 2g
  return slotIndex >= 2 ? 2 : 1;
}

export function evaluateRecruitCounsellors(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const slotIndex = (move.args[0] as number) ?? 0;
  const cost = getSlotCost(slotIndex);
  const gold = player.resources.gold;
  const counsellors = player.resources.counsellors;

  let quality = V2_CONFIG.baseQuality.recruitCounsellors;
  const reasons: string[] = [];

  // Counsellors are compound value — more actions per round.
  // Going from 4→5 is very high value. 5→6 is good. Beyond that: diminishing.
  if (counsellors <= 4) {
    quality += V2_CONFIG.bonuses.firstCounsellor;
    reasons.push("first extra counsellor");
  } else if (counsellors === 5) {
    quality += V2_CONFIG.bonuses.extraCounsellor;
  }

  // At max counsellors, not viable
  if (counsellors >= MAX_COUNSELLORS) {
    return {
      move, viable: false, quality: 0,
      reason: `already at max counsellors (${MAX_COUNSELLORS})`,
    };
  }

  // Diminishing returns beyond 6
  const dim = diminishingReturns(counsellors - 4, 0.05, 4); // relative to base 4
  quality -= dim.penalty;
  if (dim.reason) reasons.push(dim.reason);

  // Gold pressure (cheap move, light pressure)
  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  // Round awareness — early investment
  const ra = roundAwareness(G.round, G.finalRound, "early");
  quality += ra.modifier;
  if (ra.reason) reasons.push(ra.reason);

  // No strong personality dependency — everyone benefits from counsellors

  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `slot ${slotIndex}, cost ${cost}g, have ${counsellors} couns. ${reasons.join(", ")}`,
  };
}
