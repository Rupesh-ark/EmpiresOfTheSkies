/**
 * V2 Evaluator Configuration
 *
 * Single source of truth for all tunable parameters.
 * Every penalty, threshold, bonus, and limit lives here.
 */

// CMA-ES tuned values (archetype-aware pass, 2026-04-01)
export const V2_CONFIG = {
  qualityThreshold: 0.079009,
  penaltyScale: 0.554401,

  goldPressure: {
    levels: [
      { below: -10, penalty: 0.568434 },
      { below: -3,  penalty: 0.113721 },
      { below: 0,   penalty: 0.186118 },
      { below: 5,   penalty: 0.20665 },
    ],
  },

  diminishing: {
    perUnit: 0.014094,
    hardCap: 6,
    hardCapPenalty: 0.468948,
  },

  round: {
    tooEarlyPenalty: 0.139323,
    tooLatePenalty: 0.195653,
    mildPenalty: 0.10316,
    finalRoundBonus: 0.140255,
  },

  tile: {
    oceanPenalty: 0.20,
    rivalOnTilePenalty: 0.05,
    multiRivalPenalty: 0.15,
  },

  personality: {
    kaBonus: 0.12,
    legacyBonus: 0.08,
    alignmentBonus: 0.03,
  },

  baseQuality: {
    deployFleet: 0.316595,
    purchaseSkyships: 0.56671,
    recruitCounsellors: 0.370504,
    recruitRegiments: 0.296297,
    foundBuildings: 0.651994,
    foundFactory: 0.683632,
    influencePrelates: 0.672004,
    buildSkyships: 0.437572,
    moveFleet: 0.397666,
    punishDissenters: 0.185751,
    alterPlayerOrder: 0.359054,
    convertMonarch: 0.485743,
    issueHolyDecree: 0.521223,
    trainTroops: 0.211791,
    conscriptLevies: 0.392689,
    garrisonTransfer: 0.255229,
    transferBetweenFleets: 0.051587,
    sendAgitators: 0.470196,
    declareSmugglerGood: 0.22852,
    checkAndPlaceFort: 0.417848,
    transferOutpost: 0.165283,
    sellSkyships: 0.218661,
    sellBuilding: 0.111337,
    pass: 0.20,
    confirmAction: 0.40,
    discardFoWCard: 0.447824,
  },

  bonuses: {
    unclaimedLand: 0.190919,
    soleOccupier: 0.31024,
    canConquer: 0.010765,
    tradeRoutePotential: 0.202699,
    noRoutesUrgency: 0.056257,
    routeChainComplete: 0.306924,
    routeChainExtend: 0.197132,
    routeChainAdjacent: 0.207317,
    noTroopsPenalty: 0.109165,
    ownTerritory: 0.010652,
    rivalTerritory: 0.145764,
    legendTile: 0.150884,
    targetNeedsTroops: 0.024407,
    rivalsAtLocation: 0.222253,
    givingColonyPenalty: 0.126511,
    breakRoutePenalty: 0.052662,
    colonyValue: 0.047036,
    rivalsPresent: 0.023971,
    emptyGarrison: 0.080496,
    engagedFactory: 0.323437,
    unengagedFactoryPenalty: 0.52115,
    unengagedFactoryBase: 0.013315,
    cathedralVPBonus: 0.125376,
    palaceVPBonus: 0.03682,
    shipyardBaseBonus: 0.010023,
    noTerritoryFortPenalty: 0.022519,
    highGoodPrice: 0.218337,
    decentGoodPrice: 0.05653,
    noIncomeExpensiveBuildingPenalty: 0.377668,
    ownSlotBonus: 0.071483,
    republicSlotBonus: 0.228248,
    rivalSlotHighPenalty: 0.32329,
    rivalSlotLowPenalty: 0.23354,
    brokePassBonus: 0.381821,
    debtPassBonus: 0.344854,
    lowSkyships: 0.256454,
    firstCounsellor: 0.11974,
    extraCounsellor: 0.299364,
    lowTroops: 0.318165,
    lowFoWCards: 0.232762,
    noFleetsOrSkyships: 0.272726,
    strongCardBonus: 0.011172,
    midCardBonus: 0.09902,
    strongCardPenalty: 0.024698,
    weakCardBonus: 0.069972,
    fowHandFullPenalty: 0.292678,
    fowHandLowBonus: 0.083382,
    noActiveFleetsPenalty: 0.237843,
    activeFleetTrainBonus: 0.051771,
    lowSkyshipsBonus: 0.010162,
    veryLowTroopsBonus: 0.351945,
    lowTroopsBuildBonus: 0.17295,
    cantAffordRegimentsBonus: 0.194333,
    selectiveRetrievalBonus: 0.010694,
    loadFleetFromGarrisonBonus: 0.299378,
    targetLeaderBonus: 0.093439,
    earlyAgitatorPenalty: 0.014005,
    urgentDissenters: 0.029081,
    someDissenters: 0.09761,
    executeVPCost: 0.16125,
    rivalDissentersBonus: 0.140642,
    unpunishedDissentersPenalty: 0.080589,
    vpCostPenalty: 0.323069,
    misalignedBonus: 0.239261,
    cathedralConversionPenalty: 0.078886,
    dissenterConversionPenalty: 0.131266,
    deepDebtSellBonus: 0.302085,
    mildDebtSellBonus: 0.295515,
    lowSkyshipsSellPenalty: 0.383954,
  },

  discovery: {
    discoverBase: 0.45,
    noTerritoryBonus: 0.15,
    explorerBonus: 0.08,
    passBase: 0.30,
    lateGamePassBonus: 0.10,
  },

  events: {
    cardBase: 0.40,
    voteBase: 0.40,
    cathedralVoteBonus: 0.15,
    selfVoteBonus: 0.05,
    resolutionChoiceBase: 0.40,
  },

  resolution: {
    attackBase: 0.374496,
    doNotAttackBase: 0.471248,
    evadeBase: 0.600271,
    retaliateBase: 0.477965,
    drawCardBase: 0.339582,
    passCardBase: 0.105177,
    pickCardBase: 0.472243,
    plunderBase: 0.310826,
    doNotPlunderBase: 0.234077,
    groundAttackBase: 0.528072,
    doNotGroundAttackBase: 0.35233,
    defendBase: 0.426905,
    yieldBase: 0.375323,
    garrisonNoneBase: 0.201634,
    garrisonTroopsBase: 0.558738,
    coloniseBase: 0.494599,
    outpostBase: 0.465292,
    skipConquestBase: 0.35933,
    fallbackConquestBase: 0.26216,
    conquestCardBase: 0.652918,
    conquestCardPickBase: 0.58053,
    electionBase: 0.598501,
    relocateBase: 0.311018,
    keepFleetsBase: 0.3413,
    retrieveBase: 0.314271,
    infidelFightBase: 0.451138,
    infidelEvadeBase: 0.383963,
    rebellionPassBase: 0.100279,
    rebellionCommitBase: 0.498628,
    rebellionSupportBase: 0.422804,
    rebellionSupportNoTroopsBase: 0.254713,
    rebellionFallbackBase: 0.23554,
    invasionPassBase: 0.477579,
    invasionNominateBase: 0.221692,
    invasionContributeBase: 0.467831,
    invasionContributeNoneBase: 0.347955,
    invasionBuyoffBase: 0.428218,
    invasionBuyoffNoneBase: 0.434181,
    invasionFallbackBase: 0.326823,
    deferredPassBase: 0.266909,
    deferredDrawBase: 0.426673,
    deferredCardBase: 0.406172,
    fallbackBase: 0.406578,
    fowCardsBonus: 0.142739,
    routeKeepBonus: 0.144055,
    placeAtBonus: 0.378568,
    trailBonus: 0.236607,
    trailDisconnectedBonus: 0.216627,
    conquestNoRouteBonus: 0.395865,
    conquestCardHighBonus: 0.054686,
    conquestCardMidBonus: 0.017836,
    deferredCardHighBonus: 0.117498,
  },

  heresy: {
    alignedBonus: 0.05,
    mildMisalign: 0.05,
    moderateMisalign: 0.10,
    severeMisalign: 0.15,
  },

  grouping: {
    maxDestinations: 6,
    maxPerType: 5,
  },
};

// Deep copy of the original config for reset
const V2_CONFIG_DEFAULTS = JSON.parse(JSON.stringify(V2_CONFIG));

/** Override V2_CONFIG values at runtime (used by AI Tuner dashboard).
 *  Accepts a partial nested object — only provided keys are overwritten. */
export function setV2Config(overrides: Record<string, any>): void {
  deepMerge(V2_CONFIG, overrides);
}

/** Reset V2_CONFIG to original defaults */
export function resetV2Config(): void {
  deepMerge(V2_CONFIG, JSON.parse(JSON.stringify(V2_CONFIG_DEFAULTS)));
}

/** Get current V2_CONFIG as a plain object (for export/serialization) */
export function getV2Config(): typeof V2_CONFIG {
  return JSON.parse(JSON.stringify(V2_CONFIG));
}

/** Deep merge source into target (mutates target) */
function deepMerge(target: any, source: any): void {
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      target[key] !== null
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}
