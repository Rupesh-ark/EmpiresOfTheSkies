import type { MyGameState, KingdomAdvantageCard, LegacyCardInfo } from "../types";
import type { AIWeights, AIPersonality } from "./types";
import { ALL_KA_CARDS, LEGACY_CARDS } from "../data/gameData";
import { AI_CONFIG } from "./weightsConfig";

// Re-export for self-play analytics
export const ALL_KA_CARDS_LIST = ALL_KA_CARDS;
export const ALL_LEGACY_CARDS_LIST = LEGACY_CARDS;

function applyShifts(w: AIWeights, shifts: Record<string, number> | undefined): void {
  if (!shifts) return;
  for (const [key, value] of Object.entries(shifts)) {
    if (key in w) {
      w[key as keyof AIWeights] += value;
    }
  }
}

export function deriveWeightsFromCards(
  kaCard: KingdomAdvantageCard | undefined,
  legacyCard: LegacyCardInfo | undefined,
  alignment: "heretic" | "orthodox"
): AIWeights {
  // 1. Balanced baseline
  const w: AIWeights = { ...AI_CONFIG.baseline };

  // 2. Apply KA card shifts
  if (kaCard !== undefined) {
    applyShifts(w, AI_CONFIG.kaShifts[kaCard]);
  }

  // 3. Apply legacy card colour × alignment shifts
  if (legacyCard !== undefined) {
    if (legacyCard.colour === "purple" && alignment === "heretic") {
      applyShifts(w, AI_CONFIG.legacyAlignmentShifts.purpleWhenHeretic);
    }
    if (legacyCard.colour === "orange" && alignment === "orthodox") {
      applyShifts(w, AI_CONFIG.legacyAlignmentShifts.orangeWhenOrthodox);
    }
    if (legacyCard.name === "the magnificent") {
      applyShifts(w, AI_CONFIG.legacyAlignmentShifts.theMagnificent);
    }
    if (legacyCard.name === "the pious") {
      applyShifts(w, AI_CONFIG.legacyAlignmentShifts.thePious);
    }
  }

  // 4. Apply legacy card name shifts
  if (legacyCard !== undefined) {
    applyShifts(w, AI_CONFIG.legacyNameShifts[legacyCard.name]);
  }

  // 5. Add ±5% random jitter per dimension
  for (const key of Object.keys(w) as (keyof AIWeights)[]) {
    w[key] += (Math.random() - 0.5) * AI_CONFIG.jitterRange;
  }

  // 6. Clamp all weights to minimum
  for (const key of Object.keys(w) as (keyof AIWeights)[]) {
    w[key] = Math.max(AI_CONFIG.minWeight, w[key]);
  }

  // 7. Normalize to sum to 1.0
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(w) as (keyof AIWeights)[]) {
    w[key] /= sum;
  }

  return w;
}

export function derivePersonalityFromGameState(G: MyGameState, playerID: string): AIPersonality {
  const player = G.playerInfo[playerID];
  const kaCard = player.resources.advantageCard;
  const legacyCard = player.resources.legacyCard;
  const alignment = player.hereticOrOrthodox;
  const weights = deriveWeightsFromCards(kaCard, legacyCard, alignment);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const tacticalPreferences = {
    aggressionLevel: clamp(weights.military * AI_CONFIG.tacticalMultiplier, 0, 1),
    tradePreference: clamp(weights.economy * AI_CONFIG.tacticalMultiplier, 0, 1),
    expansionPreference: clamp(weights.territory * AI_CONFIG.tacticalMultiplier, 0, 1),
  };

  // Derive name from dominant weight
  const dominantKey = (Object.keys(weights) as (keyof AIWeights)[]).reduce((a, b) =>
    weights[a] > weights[b] ? a : b
  );

  const nameMap: Record<string, string> = {
    military: "Conqueror",
    economy: "Merchant",
    religion: "Prelate",
    territory: "Empire Builder",
    legacy: "Legacy Hunter",
    positioning: "Admiral",
    threats: "Warden",
    republicAccess: "Diplomat",
  };
  const name = nameMap[dominantKey] ?? "Balanced";

  const desc = `Derived from ${kaCard ?? "no KA card"} + ${
    legacyCard ? `${legacyCard.name} (${legacyCard.colour})` : "no legacy card"
  }`;

  return { name, weights, description: desc, tacticalPreferences };
}

export function reinitializeAfterLegacyPick(G: MyGameState, playerID: string): AIPersonality {
  return derivePersonalityFromGameState(G, playerID);
}
