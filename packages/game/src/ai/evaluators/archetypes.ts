import { V2_CONFIG } from "./config";

type BaseQualityKey = keyof typeof V2_CONFIG.baseQuality;
type WeightProfile = Partial<Record<BaseQualityKey, number>>;

const KA_PROFILES: Record<string, WeightProfile> = {
  "elite_regiments": {
    deployFleet: 1.5,
    trainTroops: 1.8,
    recruitRegiments: 1.3,
    conscriptLevies: 0.5,
  },

  "improved_training": {
    trainTroops: 2.0,
    deployFleet: 1.3,
    recruitRegiments: 1.5,
  },

  "licenced_smugglers": {
    foundFactory: 2.0,
    declareSmugglerGood: 2.0,
    deployFleet: 1.3,
    purchaseSkyships: 1.3,
  },

  "more_efficient_taxation": {
    foundBuildings: 1.8,
    foundFactory: 1.5,
    purchaseSkyships: 1.5,
    recruitCounsellors: 1.5,
  },

  "more_prisons": {
    punishDissenters: 2.0,
    influencePrelates: 1.5,
    convertMonarch: 0.7,
  },

  "patriarch_of_the_church": {
    influencePrelates: 2.0,
    foundBuildings: 1.8,
    recruitCounsellors: 1.3,
  },

  "sanctioned_piracy": {
    deployFleet: 1.8,
    moveFleet: 1.8,
    purchaseSkyships: 1.5,
    buildSkyships: 1.5,
  },
};

const LEGACY_PROFILES: Record<string, WeightProfile> = {
  "the conqueror": {
    deployFleet: 1.3,
    recruitRegiments: 1.5,
    trainTroops: 1.2,
    moveFleet: 1.2,
    foundFactory: 0.7,
    foundBuildings: 0.7,
    influencePrelates: 0.7,
  },

  "the navigator": {
    deployFleet: 1.4,
    purchaseSkyships: 1.3,
    buildSkyships: 1.3,
    recruitCounsellors: 1.3,
    foundFactory: 1.2,
    recruitRegiments: 0.8,
    foundBuildings: 0.8,
  },

  "the merchant": {
    foundFactory: 1.8,
    recruitCounsellors: 1.5,
    purchaseSkyships: 1.4,
    buildSkyships: 1.3,
    deployFleet: 1.1,
    recruitRegiments: 0.6,
    trainTroops: 0.7,
  },

  "the pious": {
    foundBuildings: 1.8,
    influencePrelates: 1.6,
    recruitCounsellors: 1.5,
    foundFactory: 1.3,
    punishDissenters: 1.2,
    deployFleet: 0.7,
    recruitRegiments: 0.6,
  },

  "the magnificent": {
    foundBuildings: 1.6,
    foundFactory: 1.5,
    recruitCounsellors: 1.4,
    deployFleet: 0.8,
    recruitRegiments: 0.7,
  },

  "the builder": {
    foundBuildings: 1.8,
    checkAndPlaceFort: 1.6,
    foundFactory: 1.5,
    recruitCounsellors: 1.5,
    buildSkyships: 1.2,
    deployFleet: 0.8,
    recruitRegiments: 0.8,
  },

  "the aviator": {
    purchaseSkyships: 1.8,
    buildSkyships: 1.8,
    recruitCounsellors: 1.3,
    foundFactory: 1.2,
    sellSkyships: 0.1,
    deployFleet: 0.8,
  },

  "the mighty": {
    recruitRegiments: 1.6,
    checkAndPlaceFort: 1.6,
    buildSkyships: 1.3,
    purchaseSkyships: 1.3,
    trainTroops: 1.2,
    deployFleet: 1.1,
    foundBuildings: 0.8,
  },

  "the great": {
    recruitCounsellors: 1.4,
    foundFactory: 1.2,
    foundBuildings: 1.2,
    purchaseSkyships: 1.2,
    buildSkyships: 1.1,
    influencePrelates: 1.1,
    checkAndPlaceFort: 1.1,
    deployFleet: 1.1,
    recruitRegiments: 1.1,
  },
};

const ALIGNMENT_PROFILES: Record<string, WeightProfile> = {
  "orthodox": {
    foundBuildings: 1.3,
    influencePrelates: 1.3,
    punishDissenters: 1.2,
    convertMonarch: 0.6,
  },
  "heretic": {
    convertMonarch: 1.5,
    foundBuildings: 0.6,
    influencePrelates: 0.8,
    punishDissenters: 1.3,
  },
};

const KA_LEGACY_SYNERGY: Record<string, Record<string, number>> = {
  "elite_regiments":         { "the conqueror": 10, "the mighty": 9, "the navigator": 6, "the great": 5 },
  "improved_training":       { "the conqueror": 8, "the mighty": 9, "the navigator": 5, "the great": 6 },
  "licenced_smugglers":      { "the merchant": 10, "the navigator": 8, "the builder": 5, "the great": 6 },
  "more_efficient_taxation": { "the pious": 9, "the magnificent": 9, "the builder": 8, "the merchant": 7, "the great": 7 },
  "more_prisons":            { "the pious": 7, "the great": 5, "the magnificent": 4 },
  "patriarch_of_the_church": { "the pious": 10, "the magnificent": 6, "the great": 7 },
  "sanctioned_piracy":       { "the merchant": 8, "the navigator": 7, "the conqueror": 6, "the aviator": 5 },
};

export function scoreLegacySynergy(
  kaCard: string,
  legacyOptions: { name: string; colour: string }[],
): { name: string; colour: string } {
  const synergies = KA_LEGACY_SYNERGY[kaCard.toLowerCase()] ?? {};
  let bestScore = -1;
  let bestOption = legacyOptions[0];

  for (const option of legacyOptions) {
    const score = synergies[option.name.toLowerCase()] ?? 1;
    if (score > bestScore) {
      bestScore = score;
      bestOption = option;
    }
  }

  return bestOption;
}

export function computeArchetypeQualities(
  kaCard: string,
  legacyCard: string,
  legacyColour: string,
): Record<string, number> {
  const base = { ...V2_CONFIG.baseQuality };
  const result: Record<string, number> = {};

  for (const [key, value] of Object.entries(base)) {
    result[key] = value;
  }

  const kaProfile = KA_PROFILES[kaCard.toLowerCase()];
  if (kaProfile) {
    for (const [key, multiplier] of Object.entries(kaProfile)) {
      if (key in result) {
        result[key] = Math.min(1, result[key] * multiplier);
      }
    }
  }

  const legacyProfile = LEGACY_PROFILES[legacyCard.toLowerCase()];
  if (legacyProfile) {
    for (const [key, multiplier] of Object.entries(legacyProfile)) {
      if (key in result) {
        result[key] = Math.min(1, result[key] * multiplier);
      }
    }
  }

  const alignTarget = legacyColour === "orange" ? "heretic" : "orthodox";
  const alignProfile = ALIGNMENT_PROFILES[alignTarget];
  if (alignProfile) {
    for (const [key, multiplier] of Object.entries(alignProfile)) {
      if (key in result) {
        result[key] = Math.min(1, result[key] * multiplier);
      }
    }
  }

  return result;
}

export function getBase(
  baseQualities: Record<string, number> | undefined,
  key: string,
): number {
  if (baseQualities && key in baseQualities) {
    return baseQualities[key];
  }
  return (V2_CONFIG.baseQuality as Record<string, number>)[key] ?? 0.3;
}
