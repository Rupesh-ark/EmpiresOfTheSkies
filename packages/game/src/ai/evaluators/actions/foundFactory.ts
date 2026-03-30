/**
 * V2 Evaluator: foundFactory
 *
 * Build a factory. Cost: 2-5g depending on slot.
 * Factories generate income ONLY when engaged (activeRoutes >= factories).
 * An unengaged factory is a waste of gold.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { goldPressure, goldPressureReason, personalityBonus, roundAwareness } from "../common";
import { countActiveTradeRoutes } from "../../../helpers/mapUtils";

const FACTORY_PERSONALITY = {
  kaCards: ["licenced_smugglers", "more_efficient_taxation"],
  legacyCards: ["the merchant", "the builder"],
  kaBonus: 0.10,
  legacyBonus: 0.08,
};

function getSlotCost(G: MyGameState): number {
  // Cost = 1 + factories already built this round + 1
  const slots = G.boardState.foundFactories;
  let occupants = 0;
  for (const v of Object.values(slots)) {
    if (v !== undefined) occupants++;
  }
  return occupants + 2;
}

export function evaluateFoundFactory(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const cost = getSlotCost(G);
  const gold = player.resources.gold;
  const factories = player.factories;
  const routes = countActiveTradeRoutes(G, playerID);

  let quality = V2_CONFIG.baseQuality.foundFactory;
  const reasons: string[] = [];

  if (factories >= routes) {
    quality = V2_CONFIG.bonuses.unengagedFactoryBase; // near-zero — only viable if personality strongly wants it
    reasons.push(`unengaged (${factories} fac >= ${routes} routes)`);
  } else {
    quality += V2_CONFIG.bonuses.engagedFactory;
    reasons.push(`engaged (${factories} fac < ${routes} routes)`);
  }

  // Gold pressure
  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  // Round awareness — mid-game investment (need routes first)
  const ra = roundAwareness(G.round, G.finalRound, "mid");
  quality += ra.modifier;
  if (ra.reason) reasons.push(ra.reason);

  // Personality
  const pb = personalityBonus(personality, FACTORY_PERSONALITY);
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `cost ${cost}g, fac=${factories}, routes=${routes}. ${reasons.join(", ")}`,
  };
}
