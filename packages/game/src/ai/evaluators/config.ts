/**
 * V2 Evaluator Configuration
 *
 * Single source of truth for all tunable parameters.
 * Every penalty, threshold, bonus, and limit lives here.
 */

// CMA-ES tuned values (final iterative pass, 2026-03-30)
export const V2_CONFIG = {
  qualityThreshold: 0.078066,
  penaltyScale: 0.363291,

  goldPressure: {
    levels: [
      { below: -10, penalty: 0.392632 },
      { below: -3,  penalty: 0.341515 },
      { below: 0,   penalty: 0.088837 },
      { below: 5,   penalty: 0.249942 },
    ],
  },

  diminishing: {
    perUnit: 0.083849,
    hardCap: 6,
    hardCapPenalty: 0.493577,
  },

  round: {
    tooEarlyPenalty: 0.215081,
    tooLatePenalty: 0.078734,
    mildPenalty: 0.137561,
    finalRoundBonus: 0.012288,
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
    // Counsellor actions
    deployFleet: 0.739242,
    purchaseSkyships: 0.072111,
    recruitCounsellors: 0.109467,
    recruitRegiments: 0.64727,
    foundBuildings: 0.050743,
    foundFactory: 0.23999,
    influencePrelates: 0.556932,
    buildSkyships: 0.287747,
    moveFleet: 0.496444,
    punishDissenters: 0.627517,
    alterPlayerOrder: 0.56279,
    convertMonarch: 0.733614,
    issueHolyDecree: 0.787544,

    // Free actions
    trainTroops: 0.797547,
    conscriptLevies: 0.110035,
    garrisonTransfer: 0.352888,
    transferBetweenFleets: 0.488611,
    sendAgitators: 0.124902,
    declareSmugglerGood: 0.396744,
    checkAndPlaceFort: 0.302668,
    transferOutpost: 0.662395,

    // Sell actions
    sellSkyships: 0.148311,
    sellBuilding: 0.234705,

    // Turn management
    pass: 0.20,
    confirmAction: 0.40,

    // Card management
    discardFoWCard: 0.264363,
  },

  bonuses: {
    // Territorial (Bucket E)
    unclaimedLand: 0.163076,
    soleOccupier: 0.134086,
    canConquer: 0.087061,
    tradeRoutePotential: 0.041347,
    noRoutesUrgency: 0.092323,
    routeChainComplete: 0.419762,
    routeChainExtend: 0.136408,
    routeChainAdjacent: 0.299981,
    noTroopsPenalty: 0.268251,
    ownTerritory: 0.048618,
    rivalTerritory: 0.217044,
    legendTile: 0.044007,
    targetNeedsTroops: 0.051062,
    rivalsAtLocation: 0.334898,
    givingColonyPenalty: 0.0538,
    breakRoutePenalty: 0.179538,
    colonyValue: 0.032844,
    rivalsPresent: 0.09835,

    // Economic (Bucket F)
    emptyGarrison: 0.103054,
    engagedFactory: 0.209562,
    unengagedFactoryPenalty: 0.050137,
    unengagedFactoryBase: 0.085118,
    cathedralVPBonus: 0.017893,
    palaceVPBonus: 0.195655,
    shipyardBaseBonus: 0.010048,
    noTerritoryFortPenalty: 0.344669,
    highGoodPrice: 0.146827,
    decentGoodPrice: 0.011628,
    noIncomeExpensiveBuildingPenalty: 0.065195,
    ownSlotBonus: 0.237324,
    republicSlotBonus: 0.082248,
    rivalSlotHighPenalty: 0.28038,
    rivalSlotLowPenalty: 0.07953,
    brokePassBonus: 0.271046,
    debtPassBonus: 0.286519,

    // Military (Bucket G)
    lowSkyships: 0.013318,
    firstCounsellor: 0.016201,
    extraCounsellor: 0.294746,
    lowTroops: 0.219069,
    lowFoWCards: 0.063302,
    noFleetsOrSkyships: 0.228742,
    strongCardBonus: 0.12445,
    midCardBonus: 0.16147,
    strongCardPenalty: 0.357521,
    weakCardBonus: 0.019821,
    fowHandFullPenalty: 0.059195,
    fowHandLowBonus: 0.022333,
    noActiveFleetsPenalty: 0.057108,
    activeFleetTrainBonus: 0.132876,
    lowSkyshipsBonus: 0.08072,
    veryLowTroopsBonus: 0.093436,
    lowTroopsBuildBonus: 0.087808,
    cantAffordRegimentsBonus: 0.113061,
    selectiveRetrievalBonus: 0.012772,
    loadFleetFromGarrisonBonus: 0.288253,

    // Free actions (Bucket I)
    targetLeaderBonus: 0.095385,
    earlyAgitatorPenalty: 0.080056,
    urgentDissenters: 0.1504,
    someDissenters: 0.072534,
    executeVPCost: 0.263159,
    rivalDissentersBonus: 0.104717,
    unpunishedDissentersPenalty: 0.256711,
    vpCostPenalty: 0.046242,
    misalignedBonus: 0.029845,
    cathedralConversionPenalty: 0.125214,
    dissenterConversionPenalty: 0.079752,
    deepDebtSellBonus: 0.205569,
    mildDebtSellBonus: 0.269918,
    lowSkyshipsSellPenalty: 0.015752,
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
    attackBase: 0.422639,
    doNotAttackBase: 0.464645,
    evadeBase: 0.477518,
    retaliateBase: 0.496884,
    drawCardBase: 0.494621,
    passCardBase: 0.567274,
    pickCardBase: 0.417199,
    plunderBase: 0.601936,
    doNotPlunderBase: 0.25785,
    groundAttackBase: 0.33127,
    doNotGroundAttackBase: 0.490154,
    defendBase: 0.423773,
    yieldBase: 0.326673,
    garrisonNoneBase: 0.465238,
    garrisonTroopsBase: 0.657634,
    coloniseBase: 0.59901,
    outpostBase: 0.546006,
    skipConquestBase: 0.232421,
    fallbackConquestBase: 0.593651,
    conquestCardBase: 0.474104,
    conquestCardPickBase: 0.123166,
    electionBase: 0.40162,
    relocateBase: 0.510043,
    keepFleetsBase: 0.535376,
    retrieveBase: 0.298493,
    infidelFightBase: 0.579199,
    infidelEvadeBase: 0.39761,
    rebellionPassBase: 0.317687,
    rebellionCommitBase: 0.367162,
    rebellionSupportBase: 0.613477,
    rebellionSupportNoTroopsBase: 0.310726,
    rebellionFallbackBase: 0.228193,
    invasionPassBase: 0.311271,
    invasionNominateBase: 0.344048,
    invasionContributeBase: 0.288498,
    invasionContributeNoneBase: 0.317919,
    invasionBuyoffBase: 0.439891,
    invasionBuyoffNoneBase: 0.221519,
    invasionFallbackBase: 0.520708,
    deferredPassBase: 0.662872,
    deferredDrawBase: 0.219601,
    deferredCardBase: 0.18311,
    fallbackBase: 0.483037,
    fowCardsBonus: 0.266091,
    routeKeepBonus: 0.163492,
    placeAtBonus: 0.399066,
    trailBonus: 0.244085,
    trailDisconnectedBonus: 0.021964,
    conquestNoRouteBonus: 0.262855,
    conquestCardHighBonus: 0.300352,
    conquestCardMidBonus: 0.180553,
    deferredCardHighBonus: 0.120466,
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
