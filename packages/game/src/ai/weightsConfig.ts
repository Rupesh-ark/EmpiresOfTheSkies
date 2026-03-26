import type { AIWeights } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT AI CONFIG — committed to repo. Bland/average placeholders only.
//
// Real tuned weights live in weightsConfig.local.json (gitignored).
// Create that file with any subset of keys to override these defaults.
// ═══════════════════════════════════════════════════════════════════════════

const BALANCED: AIWeights = {
  territory: 0.125, economy: 0.125, military: 0.125, religion: 0.125,
  legacy: 0.125, positioning: 0.125, threats: 0.125, republicAccess: 0.125,
};

const NO_SHIFT = {} as Record<string, number>;

const DEFAULTS = {
  baseline: { ...BALANCED } as AIWeights,

  jitterRange: 0,
  minWeight: 0.01,
  tacticalMultiplier: 1,

  kaShifts: {
    elite_regiments:         NO_SHIFT,
    improved_training:       NO_SHIFT,
    licenced_smugglers:      NO_SHIFT,
    more_efficient_taxation: NO_SHIFT,
    more_prisons:            NO_SHIFT,
    patriarch_of_the_church: NO_SHIFT,
    sanctioned_piracy:       NO_SHIFT,
  } as Record<string, Record<string, number>>,

  legacyNameShifts: {
    "the conqueror":   NO_SHIFT,
    "the navigator":   NO_SHIFT,
    "the merchant":    NO_SHIFT,
    "the mighty":      NO_SHIFT,
    "the pious":       NO_SHIFT,
    "the magnificent": NO_SHIFT,
    "the builder":     NO_SHIFT,
    "the aviator":     NO_SHIFT,
    "the great":       NO_SHIFT,
  } as Record<string, Record<string, number>>,

  legacyAlignmentShifts: {
    purpleWhenHeretic:  NO_SHIFT,
    orangeWhenOrthodox: NO_SHIFT,
    theMagnificent:     NO_SHIFT,
    thePious:           NO_SHIFT,
  } as Record<string, Record<string, number>>,

  eval: {
    territory:      { colonyWeight: 1, fortWeight: 1, routeWeight: 1 },
    economy:        { factoryIncomeValue: 1, unengagedPenalty: 0 },
    military:       { levyWeight: 1, eliteWeight: 1, skyshipWeight: 1 },
    religion:       { archprelateBonus: 0, fatigueFactor: 0, buildingBonus: 0, dissenterPenalty: 0 },
    legacy:         { maxReasonableVP: 20, earlyGameWeight: 0.5, lateGameWeight: 0.5 },
    positioning:    { fleetWeight: 0.33, counsellorWeight: 0.34, fowWeight: 0.33, fowMax: 4 },
    threats:        { dissenterThreat: 0, piracyExposureWeight: 0 },
    republicAccess: { mercyVPGapScale: 20 },
  },

  moveValues: {
    recruitCounsellors:        { base: 0.1 },
    recruitRegiments:          { base: 0.1 },
    purchaseSkyships:          { base: 0.1 },
    cathedralOrthodox:         { base: 0.1 },
    cathedralHeretic:          { base: 0.1 },
    palaceHeretic:             { base: 0.1 },
    palaceOrthodox:            { base: 0.1 },
    shipyard:                  { base: 0.1 },
    fort:                      { base: 0.1 },
    foundBuildingsDefault:     { base: 0.1 },
    foundFactoryEngaged:       { base: 0.1 },
    foundFactoryUnengaged:     { base: 0.1 },
    influencePrelatesRegular:  { base: 0.1 },
    influencePrelatesRepublic: { base: 0.1 },
    influenceMercyBoostScale:  0,
    influenceMercyVPGapScale:  1,
    sendAgitatorsBase:         { base: 0.1 },
    sendAgitatorsLeaderBonus:  0,
    deployFleet:               { base: 0.1 },
    moveFleet:                 { base: 0.1 },
    garrisonTransfer:          { base: 0.1 },
    trainTroops:               { base: 0.1 },
    drawFoWCards:              { base: 0.1 },
    buildSkyships:             { base: 0.1 },
    conscriptLevies:           { base: 0.1 },
    increaseHeresyAligned:     { base: 0.1 },
    increaseHeresyMisaligned:  { base: 0.05 },
    convertMonarch:            { base: 0.1 },
    alterPlayerOrder:          { base: 0.1 },
    sell:                      { base: 0.05 },
    discoverTile:              { base: 0.1 },
    attack:                    { base: 0.1 },
    passive:                   { base: 0.05 },
    evade:                     { base: 0.1 },
    plunder:                   { base: 0.1 },
    coloniseLand:              { base: 0.1 },
    constructOutpost:          { base: 0.1 },
    voteSelf:                  { base: 0.1 },
    voteOther:                 { base: 0.1 },
    retrieveFleets:            { base: 0.1 },
    chooseEventCard:           { base: 0.1 },
    pickCard:                  { base: 0.1 },
    pass:                      { base: 0.0 },
    defaultMove:               { base: 0.05 },
    punishDissenters:          { base: 0.1 },
    drawBattleCard:            { base: 0.1 },
    playBattleCard:            { base: 0.1 },
    garrisonTroops:            { base: 0.1 },
    defendGround:              { base: 0.1 },
    yieldGround:               { base: 0.05 },
    commitRebellionTroops:     { base: 0.1 },
    contributeToRebellion:     { base: 0.05 },
    contributeToGrandArmy:     { base: 0.1 },
    nominateCaptainGeneral:    { base: 0.1 },
    offerBuyoffGold:           { base: 0.1 },
    immediateElectionVote:     { base: 0.1 },
    relocateDefeatedFleet:     { base: 0.1 },
    resolveEventChoice:        { base: 0.1 },
    respondToInfidelFleet:     { base: 0.1 },
    discardFoWCard:            { base: 0.05 },
    transferBetweenFleets:     { base: 0.05 },
    transferOutpost:           { base: 0.02 },
    declareSmugglerGood:       { base: 0.08 },
    checkAndPlaceFort:         { base: 0.1 },
    retaliate:                 { base: 0.1 },
    commitDeferredBattleCard:  { base: 0.15 },
  } as Record<string, Record<string, number> | number>,

  defaultPersonality: {
    weights: { ...BALANCED } as AIWeights,
    tacticalDefaults: {
      aggressionLevel: 0.5,
      tradePreference: 0.5,
      expansionPreference: 0.5,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// JSON override: deep-merge weightsConfig.local.json on top of defaults.
// If the file doesn't exist, defaults are used as-is.
// IMPORTANT: To override a base value, set it explicitly (e.g. "base": 0).
// ═══════════════════════════════════════════════════════════════════════════

function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== "object") return target;
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === "object" &&
      source[key] !== null &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      target[key] !== null
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

import localOverrides from "./weightsConfig.local.json";

export const AI_CONFIG: typeof DEFAULTS = deepMerge(DEFAULTS, localOverrides as Record<string, unknown>);
