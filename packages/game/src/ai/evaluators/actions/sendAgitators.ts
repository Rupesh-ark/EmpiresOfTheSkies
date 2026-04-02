/**
 * V2 Evaluator: sendAgitators
 *
 * Place a dissenter in a rival's kingdom. Cost: 2g.
 * Anytime action (no counsellor cost, doesn't end turn).
 * Max 1 per rival per round.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { getBase } from "../archetypes";
import { goldPressure, goldPressureReason, personalityBonus, roundAwareness } from "../common";

const AGITATOR_PERSONALITY = {
  kaCards: ["more_prisons"],
  legacyCards: ["the mighty", "the conqueror"],
  kaBonus: 0.06,
  legacyBonus: 0.05,
};

export function evaluateSendAgitators(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const targetID = move.args[0] as string;
  const gold = player.resources.gold;
  const cost = 2;

  let quality = getBase(personality.baseQualities, "sendAgitators");
  const reasons: string[] = [];

  // Target the VP leader for maximum disruption
  const allVPs = Object.values(G.playerInfo).map(p => p.resources.victoryPoints);
  const leaderVP = Math.max(...allVPs);
  const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
  if (targetVP === leaderVP && targetID !== playerID) {
    quality += V2_CONFIG.bonuses.targetLeaderBonus;
    reasons.push("targeting VP leader");
  }

  // Gold pressure — 2g is cheap but still matters when broke
  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  // Round awareness — offensive, better mid/late game
  const ra = roundAwareness(G.round, G.finalRound, "mid");
  quality += ra.modifier;
  if (ra.reason) reasons.push(ra.reason);

  // Early game penalty — should be building engine, not disrupting
  if (G.round <= 2) {
    quality -= V2_CONFIG.bonuses.earlyAgitatorPenalty * V2_CONFIG.penaltyScale;
    reasons.push("too early for agitation");
  }

  // Personality
  const pb = personalityBonus(personality, AGITATOR_PERSONALITY);
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `target P${targetID}, cost ${cost}g. ${reasons.join(", ")}`,
  };
}
