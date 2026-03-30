/**
 * V2 Evaluator: foundBuildings
 *
 * Evaluates whether building a cathedral, palace, shipyard, or fort
 * is a reasonable action given current game state and personality.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { goldPressure, goldPressureReason, personalityBonus, roundAwareness, diminishingReturns, heresyPressure } from "../common";
import { BUILDING_BASE_COST, BuildingSlot } from "../../../data/gameData";
import { countActiveTradeRoutes } from "../../../helpers/mapUtils";

// Building type from slot index

type BuildingType = "cathedral" | "palace" | "shipyard" | "fort";

const SLOT_TO_TYPE: Record<number, BuildingType> = {
  0: "cathedral",
  1: "palace",
  2: "shipyard",
  3: "fort",
};

const SLOT_TO_BUILDING_SLOT: Record<number, number> = {
  0: BuildingSlot.Cathedral,
  1: BuildingSlot.Palace,
  2: BuildingSlot.Shipyard,
  3: BuildingSlot.Fort,
};

// Cost calculation (mirrors foundBuildings.ts logic)

function getBuildingCost(G: MyGameState, slotIndex: number): number {
  const buildingType = SLOT_TO_TYPE[slotIndex];
  if (!buildingType) return 999;
  const boardSlot = SLOT_TO_BUILDING_SLOT[slotIndex];
  const occupants = G.boardState.foundBuildings[boardSlot]?.length ?? 0;
  return BUILDING_BASE_COST[buildingType] + occupants + 1;
}

function getOwnedCount(player: MyGameState["playerInfo"][string], buildingType: BuildingType): number {
  switch (buildingType) {
    case "cathedral": return player.cathedrals;
    case "palace": return player.palaces;
    case "shipyard": return player.shipyards;
    case "fort": return 0;
  }
}

// Personality config per building type

const CATHEDRAL_PERSONALITY = {
  kaCards: ["patriarch_of_the_church"],
  legacyCards: ["the pious", "the magnificent"],
  kaBonus: 0.15,
  legacyBonus: 0.10,
};

const PALACE_PERSONALITY = {
  legacyCards: ["the magnificent"],
  legacyBonus: 0.10,
};

const SHIPYARD_PERSONALITY = {
  kaCards: ["elite_regiments", "improved_training"],
  legacyCards: ["the aviator", "the conqueror", "the navigator"],
  kaBonus: 0.08,
  legacyBonus: 0.08,
};

const FORT_PERSONALITY = {
  legacyCards: ["the builder"],
  legacyBonus: 0.08,
};

// Main evaluator

export function evaluateFoundBuildings(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const slotIndex = move.args[0] as number;
  const buildingType = SLOT_TO_TYPE[slotIndex] ?? "cathedral";
  const cost = getBuildingCost(G, slotIndex);
  const gold = player.resources.gold;
  const owned = getOwnedCount(player, buildingType);

  let quality = V2_CONFIG.baseQuality.foundBuildings;
  const reasons: string[] = [];

  // Gold pressure (from common)
  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  // Diminishing returns (from common)
  const dim = diminishingReturns(owned);
  quality -= dim.penalty;
  if (dim.reason) reasons.push(dim.reason);

  // Round awareness — timing depends on building type + alignment
  let timing: "early" | "mid" | "late" | "any" = "mid";
  if (buildingType === "shipyard") {
    timing = "early"; // infrastructure — need it early to produce ships
  } else if (buildingType === "fort") {
    timing = "any"; // defensive — anytime
  } else if (buildingType === "cathedral") {
    // Orthodox players with purple legacy card should build mid-game
    // Others: late-game VP play
    if (personality.alignment === "orthodox" && personality.legacyCardColour === "purple") {
      timing = "mid";
    } else {
      timing = "late";
    }
  } else if (buildingType === "palace") {
    // Heretic players with orange legacy card should build mid-game
    if (personality.alignment === "heretic" && personality.legacyCardColour === "orange") {
      timing = "mid";
    } else {
      timing = "late";
    }
  }
  const ra = roundAwareness(G.round, G.finalRound, timing);
  quality += ra.modifier;
  if (ra.reason) reasons.push(ra.reason);

  // Building-type-specific logic

  if (buildingType === "cathedral") {
    quality += V2_CONFIG.bonuses.cathedralVPBonus; // cathedrals give VP + election power
    const pb = personalityBonus(personality, CATHEDRAL_PERSONALITY);
    quality += pb.bonus;
    reasons.push(...pb.reasons);
    if (personality.alignment === "orthodox") quality += V2_CONFIG.personality.alignmentBonus;
  }

  if (buildingType === "palace") {
    quality += V2_CONFIG.bonuses.palaceVPBonus;
    const pb = personalityBonus(personality, PALACE_PERSONALITY);
    quality += pb.bonus;
    reasons.push(...pb.reasons);
    if (personality.alignment === "heretic") quality += V2_CONFIG.personality.alignmentBonus;
  }

  if (buildingType === "shipyard") {
    quality += V2_CONFIG.bonuses.shipyardBaseBonus;
    const pb = personalityBonus(personality, SHIPYARD_PERSONALITY);
    quality += pb.bonus;
    reasons.push(...pb.reasons);
  }

  if (buildingType === "fort") {
    const territories = player.fleetInfo.filter(f => f.skyships > 0).length;
    if (territories === 0) {
      quality -= V2_CONFIG.bonuses.noTerritoryFortPenalty * V2_CONFIG.penaltyScale;
      reasons.push("no territory to protect");
    }
    const pb = personalityBonus(personality, FORT_PERSONALITY);
    quality += pb.bonus;
    reasons.push(...pb.reasons);
  }

  if (buildingType === "cathedral" || buildingType === "palace") {
    const hp = heresyPressure(personality.alignment, player.heresyTracker, personality.legacyCardColour);
    // Cathedral retreats heresy (good for orthodox), Palace can advance (good for heretic)
    if (buildingType === "cathedral" && personality.legacyCardColour === "purple") {
      quality += Math.abs(hp.modifier); // cathedral helps align orthodox
    } else if (buildingType === "palace" && personality.legacyCardColour === "orange") {
      quality += Math.abs(hp.modifier); // palace helps align heretic
    } else if (hp.modifier < 0) {
      quality += hp.modifier; // misaligned building choice penalized
    }
    if (hp.reason) reasons.push(hp.reason);
  }

  // No-income penalty: expensive buildings without trade routes
  const routes = countActiveTradeRoutes(G, playerID);
  if (routes === 0 && cost >= 5 && (buildingType === "cathedral" || buildingType === "palace")) {
    quality -= V2_CONFIG.bonuses.noIncomeExpensiveBuildingPenalty * V2_CONFIG.penaltyScale;
    reasons.push("no trade routes — expensive building bleeds gold");
  }

  // Clamp and return
  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `${buildingType} #${owned + 1}, cost ${cost}g, goldAfter ${gold - cost}. ${reasons.join(", ")}`,
  };
}
