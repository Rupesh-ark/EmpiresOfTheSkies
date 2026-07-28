/** Infidel Invasion resolution logic. */

import {
  FortuneOfWarCardInfo,
  MyGameState,
} from "../types.js";
import {
  addVPAmount,
  removeVPAmount,
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  logEvent,
} from "./stateUtils.js";
import { calculateCombat } from "./combatMath.js";
import { drawFortuneOfWarCard } from "./helpers.js";
import { apportionBattleLosses } from "./battleLosses.js";
import {
  ASSIGNABLE_KINGDOMS,
  INFIDEL_EMPIRE_LOCATION,
  CAPTAIN_GENERAL_VP,
  LARGEST_FORCE_VP,
  SECOND_LARGEST_VP,
  TIED_LARGEST_VP,
} from "../data/gameData.js";
import {
  returnContingentCounter,
  returnInfidelHostCounter,
} from "./counterPools.js";

type Shuffle = <T>(arr: T[]) => T[];

type PlayerContribution = {
  playerID: string;
  regiments: number;
  levies: number;
  skyships: number;
  unitCount: number;
  strength: number;
};

export type InvasionAdvanceResult =
  | { status: "awaiting_fow"; playerID: string }
  | { status: "victory" }
  | { status: "defeat"; buyoffCost: number };

// Host counter draw

/**
 * Called each round during Resolution. Draws 1 Host counter and checks
 * for invasion trigger. Returns true if invasion was triggered (caller
 * should set up the interactive invasion flow).
 */
export const checkForInvasion = (G: MyGameState): boolean => {
  if (G.eventState.grandInfidelDies) {
    G.eventState.grandInfidelDies = false;
    logEvent(G, "Infidel Invasion step skipped (Grand Infidel Dies)");
    return false;
  }

  if (G.infidelHostPool.length === 0) return false;

  const drawn = G.infidelHostPool.pop()!;

  if (drawn.isFleet) {
    G.infidelFleet = {
      counter: drawn,
      location: [...INFIDEL_EMPIRE_LOCATION],
      active: true,
      destroyed: false,
    };
    logEvent(G, "Infidel Fleet drawn — placed at Infidel Empire");
  } else {
    logEvent(G, `Infidel Host drawn: ${drawn.swords} Swords`);
    G.accumulatedHosts.push(drawn);
  }

  if (!drawn.isInvasionTrigger) return false;

  logEvent(G, "INVASION TRIGGERED! Grand Army of the Faith is raised!");
  const totalHostSwords = G.accumulatedHosts.reduce(
    (sum, host) => sum + (host.isFleet ? 0 : host.swords),
    0
  );
  const playerIds = Object.keys(G.playerInfo);
  const hasOrthodox = playerIds.some(
    (id) => G.playerInfo[id].hereticOrOrthodox === "orthodox"
  );
  const eligibleCaptainGenerals = playerIds.filter(
    (id) =>
      !hasOrthodox ||
      G.playerInfo[id].hereticOrOrthodox === "orthodox"
  );

  G.currentInvasion = {
    totalHostSwords,
    contributions: {},
    phase: "nominate",
    eligibleCaptainGenerals,
  };
  return true;
};

export const getArchprelateForNomination = (G: MyGameState): string | null =>
  Object.values(G.playerInfo).find((player) => player.isArchprelate)?.id ?? null;

const getCaptainGeneral = (G: MyGameState): string =>
  G.turnOrder.find((id) => G.playerInfo[id].isCaptainGeneral) ??
  G.turnOrder[0];

const getContributions = (G: MyGameState): PlayerContribution[] => {
  const invasion = G.currentInvasion;
  if (!invasion) return [];

  return G.turnOrder.map((playerID) => {
    const contribution = invasion.contributions[playerID] ?? {
      regiments: 0,
      levies: 0,
      skyships: 0,
    };
    return {
      playerID,
      regiments: contribution.regiments,
      levies: contribution.levies,
      skyships: contribution.skyships,
      unitCount:
        contribution.regiments +
        contribution.levies +
        contribution.skyships,
      strength:
        contribution.regiments * 2 +
        contribution.levies +
        contribution.skyships,
    };
  });
};

const rankPlayerForces = (
  contributions: PlayerContribution[]
): NonNullable<MyGameState["currentInvasion"]>["forceRanking"] => {
  const rank = (descending: boolean): string[][] => {
    const values = [...new Set(contributions.map((c) => c.unitCount))].sort(
      (a, b) => (descending ? b - a : a - b)
    );
    return values.slice(0, 2).map((value) =>
      contributions
        .filter((contribution) => contribution.unitCount === value)
        .map((contribution) => contribution.playerID)
    );
  };

  const descending = rank(true);
  const ascending = rank(false);
  return {
    largest: descending[0] ?? [],
    secondLargest: descending[1] ?? [],
    smallest: ascending[0] ?? [],
    secondSmallest: ascending[1] ?? [],
  };
};

const setupNprContingents = (G: MyGameState): void => {
  const invasion = G.currentInvasion;
  if (!invasion) return;

  const seatedKingdoms = new Set(
    Object.values(G.playerInfo).map((player) => player.kingdomName)
  );
  // The six assignable Kingdom slots map one-to-one to player seats. Only
  // slots without a seated player receive an NPR Grand Army contingent.
  const nonPlayerRealms = ASSIGNABLE_KINGDOMS.filter(
    (kingdom) => !seatedKingdoms.has(kingdom)
  );

  invasion.nprContingents = [];
  for (const realm of nonPlayerRealms) {
    if (G.contingentPool.length === 0) break;
    invasion.nprContingents.push({
      realm,
      swords: G.contingentPool.pop()!,
    });
  }
};

const hasCaptainGeneralHandCard = (G: MyGameState): boolean => {
  const captainGeneral = getCaptainGeneral(G);
  return (
    G.playerInfo[captainGeneral]?.resources.fortuneCards.length ?? 0
  ) > 0;
};

const awaitCaptainGeneralFoW = (
  G: MyGameState,
  phase: "aerial_fow" | "ground_fow"
): InvasionAdvanceResult => {
  const invasion = G.currentInvasion!;
  const captainGeneral = getCaptainGeneral(G);
  invasion.phase = phase;
  G.step =
    phase === "aerial_fow"
      ? "invasion_aerial_fow"
      : "invasion_ground_fow";
  return { status: "awaiting_fow", playerID: captainGeneral };
};

const drawCombatCard = (
  G: MyGameState,
  shuffle: Shuffle
): FortuneOfWarCardInfo =>
  drawFortuneOfWarCard(G, shuffle, { redrawNoEffect: false });

const returnDestroyedInfidelFleet = (
  G: MyGameState,
  shuffle: Shuffle
): void => {
  if (!G.infidelFleet) return;
  returnInfidelHostCounter(
    G,
    G.infidelFleet.counter,
    shuffle
  );
  G.infidelFleet = null;
};

const applyAerialSkyshipLosses = (
  G: MyGameState,
  hitsOnFleetWing: number
): number => {
  const invasion = G.currentInvasion;
  if (!invasion?.survivingSkyships) return 0;

  const totalSkyships = Object.values(invasion.survivingSkyships).reduce(
    (sum, skyships) => sum + skyships,
    0
  );
  const losses = apportionBattleLosses(
    {
      regiments: 0,
      levies: 0,
      skyships: totalSkyships,
      eliteRegiments: 0,
    },
    hitsOnFleetWing,
    "aerial"
  ).skyships;

  // Contributors retain ownership rather than pooling survivors pro-rata.
  // As with ground casualties, losses fall on the largest contributor first,
  // with earliest IPO breaking equal-contribution ties.
  const ipo = new Map(
    G.turnOrder.map((playerID, index) => [playerID, index])
  );
  const lossOrder = [...G.turnOrder].sort(
    (a, b) =>
      (invasion.survivingSkyships![b] ?? 0) -
        (invasion.survivingSkyships![a] ?? 0) ||
      (ipo.get(a) ?? 0) - (ipo.get(b) ?? 0)
  );
  let remainingLosses = losses;
  for (const playerID of lossOrder) {
    if (remainingLosses <= 0) break;
    const available = invasion.survivingSkyships[playerID] ?? 0;
    const lost = Math.min(available, remainingLosses);
    invasion.survivingSkyships[playerID] = available - lost;
    G.playerInfo[playerID].resources.skyships = Math.max(
      0,
      G.playerInfo[playerID].resources.skyships - lost
    );
    remainingLosses -= lost;
    if (lost > 0) {
      logEvent(
        G,
        `${G.playerInfo[playerID].kingdomName} loses ${lost} Grand Army skyship(s)`
      );
    }
  }

  return losses;
};

const resolveAerialCombat = (
  G: MyGameState,
  shuffle: Shuffle,
  captainFoW?: { sword: number; shield: number }
): void => {
  const invasion = G.currentInvasion;
  const infidelFleet = G.infidelFleet;
  if (!invasion?.survivingSkyships || !infidelFleet) return;

  const fleetWingStrength = Object.values(
    invasion.survivingSkyships
  ).reduce((sum, skyships) => sum + skyships, 0);
  const infidelStrength = infidelFleet.counter.swords;
  const infidelFoW = drawCombatCard(G, shuffle);
  const armyFoW = captainFoW ?? drawCombatCard(G, shuffle);

  const { hitsOnAttacker: hitsOnFleetWing, hitsOnDefender: hitsOnInfidel } =
    calculateCombat(
      {
        swords: fleetWingStrength,
        shields: fleetWingStrength,
        fowSword: armyFoW.sword,
        fowShield: armyFoW.shield,
      },
      {
        swords: infidelFleet.counter.swords,
        shields: infidelFleet.counter.shields,
        fowSword: infidelFoW.sword,
        fowShield: infidelFoW.shield,
      }
    );

  const skyshipsLost = applyAerialSkyshipLosses(G, hitsOnFleetWing);
  const playerSurvives = hitsOnFleetWing < fleetWingStrength;
  const infidelSurvives = hitsOnInfidel < infidelStrength;

  // The contributed wing attacks the Fleet in its Empire space, so the
  // Infidel Fleet is the defender and wins equal-loss ties (eots42:669).
  const playersWin =
    playerSurvives !== infidelSurvives
      ? playerSurvives
      : hitsOnFleetWing !== hitsOnInfidel
        ? hitsOnFleetWing < hitsOnInfidel
        : false;

  invasion.aerialOutcome = playersWin ? "players" : "infidel";
  if (!playersWin) {
    // Survivors retreat to their contributors and do not enter ground combat.
    for (const playerID of G.turnOrder) {
      invasion.survivingSkyships[playerID] = 0;
    }
    logEvent(
      G,
      "Infidel Fleet wins the aerial battle; surviving Grand Army skyships retreat"
    );
  } else {
    logEvent(
      G,
      "Grand Army fleet wing wins; surviving skyships join the ground host"
    );
  }

  // The Fleet ignores all losses when it wins. Only a victorious player wing
  // can destroy it or force a surviving Fleet to retreat flipped/inactive.
  if (playersWin) {
    if (hitsOnInfidel >= infidelStrength) {
      logEvent(G, "Infidel Fleet destroyed in the invasion aerial battle");
      returnDestroyedInfidelFleet(G, shuffle);
    } else if (G.infidelFleet) {
      G.infidelFleet.location = [...INFIDEL_EMPIRE_LOCATION];
      G.infidelFleet.active = false;
    }
  }

  G.battleResult = {
    battleType: "Infidel Invasion — Aerial",
    attackerName: "Grand Army Fleet Wing",
    defenderName: "Infidel Fleet",
    attackerSwords: fleetWingStrength,
    attackerShields: fleetWingStrength,
    defenderSwords: infidelFleet.counter.swords,
    defenderShields: infidelFleet.counter.shields,
    attackerFoW: armyFoW,
    defenderFoW: infidelFoW,
    attackerLosses:
      skyshipsLost > 0 ? `${skyshipsLost} skyship(s)` : "none",
    defenderLosses: `${hitsOnInfidel} hits`,
    winner: playersWin ? "Grand Army Fleet Wing" : "Infidel Fleet",
    outcome: playersWin
      ? "Grand Army fleet wing wins the aerial battle"
      : "Grand Army fleet wing retreats",
  };
};

const applyVictoryRewards = (
  G: MyGameState,
  captainGeneral: string
): void => {
  const ranking = G.currentInvasion?.forceRanking;
  addVPAmount(G, captainGeneral, CAPTAIN_GENERAL_VP);
  if (!ranking || ranking.largest.length === 0) return;

  if (ranking.largest.length > 1) {
    // The rulebook parenthetical "(4VP each if tied)" grammatically attaches
    // to the second-place clause; for consistency, any tie at either rank
    // receives 4VP each and no additional rank is awarded within that tie.
    for (const playerID of ranking.largest) {
      addVPAmount(G, playerID, TIED_LARGEST_VP);
    }
    return;
  }

  addVPAmount(G, ranking.largest[0], LARGEST_FORCE_VP);
  if (ranking.secondLargest.length > 1) {
    for (const playerID of ranking.secondLargest) {
      addVPAmount(G, playerID, TIED_LARGEST_VP);
    }
  } else if (ranking.secondLargest.length === 1) {
    addVPAmount(G, ranking.secondLargest[0], SECOND_LARGEST_VP);
  }
};

const applyDefeatVPPenalties = (
  G: MyGameState,
  captainGeneral: string
): void => {
  const ranking = G.currentInvasion?.forceRanking;
  removeVPAmount(G, captainGeneral, CAPTAIN_GENERAL_VP);
  if (!ranking || ranking.smallest.length === 0) return;

  if (ranking.smallest.length > 1) {
    // Mirror the victory reading: any tied penalty rank is -4VP each.
    for (const playerID of ranking.smallest) {
      removeVPAmount(G, playerID, TIED_LARGEST_VP);
    }
    return;
  }

  removeVPAmount(G, ranking.smallest[0], LARGEST_FORCE_VP);
  if (ranking.secondSmallest.length > 1) {
    for (const playerID of ranking.secondSmallest) {
      removeVPAmount(G, playerID, TIED_LARGEST_VP);
    }
  } else if (ranking.secondSmallest.length === 1) {
    removeVPAmount(G, ranking.secondSmallest[0], SECOND_LARGEST_VP);
  }
};

const applyDefeatCasualties = (
  G: MyGameState,
  contributions: PlayerContribution[]
): void => {
  const survivingSkyships = G.currentInvasion?.survivingSkyships;

  for (const contribution of contributions) {
    const skyships = survivingSkyships?.[contribution.playerID] ?? 0;
    const resources = G.playerInfo[contribution.playerID].resources;
    resources.regiments = Math.max(
      0,
      resources.regiments - contribution.regiments
    );
    resources.levies = Math.max(
      0,
      resources.levies - contribution.levies
    );
    resources.skyships = Math.max(0, resources.skyships - skyships);
    if (survivingSkyships) {
      survivingSkyships[contribution.playerID] = 0;
    }

    if (contribution.regiments + contribution.levies + skyships > 0) {
      logEvent(
        G,
        `${G.playerInfo[contribution.playerID].kingdomName}'s Grand Army contribution is annihilated`
      );
    }
  }
};

const applyVictoryCasualties = (
  G: MyGameState,
  hitsOnArmy: number,
  contributions: PlayerContribution[]
): void => {
  const invasion = G.currentInvasion;
  if (!invasion) return;

  type CasualtyForce =
    | {
        kind: "player";
        playerID: string;
        size: number;
        strength: number;
        ipo: number;
        regiments: number;
        levies: number;
        skyships: number;
      }
    | {
        kind: "npr";
        realm: string;
        size: number;
        strength: number;
        ipo: number;
      };

  const playerForces: CasualtyForce[] = contributions.map(
    (contribution, ipo) => {
      const skyships =
        invasion.survivingSkyships?.[contribution.playerID] ?? 0;
      return {
        kind: "player",
        playerID: contribution.playerID,
        size:
          contribution.regiments + contribution.levies + skyships,
        strength:
          contribution.regiments * 2 +
          contribution.levies +
          skyships,
        ipo,
        regiments: contribution.regiments,
        levies: contribution.levies,
        skyships,
      };
    }
  );
  const nprForces: CasualtyForce[] = (
    invasion.nprContingents ?? []
  ).map((contingent, index) => ({
    kind: "npr",
    realm: contingent.realm,
    // A contingent counter has no individual unit pieces; its printed
    // strength is the only rulebook measure available for force size.
    size: contingent.swords,
    strength: contingent.swords,
    ipo: G.turnOrder.length + index,
  }));

  const forces = [...playerForces, ...nprForces].sort(
    (a, b) => b.size - a.size || a.ipo - b.ipo
  );
  let remainingHits = hitsOnArmy;

  for (const force of forces) {
    if (remainingHits <= 0) break;
    if (force.strength <= 0) continue;
    const forceHits = Math.min(remainingHits, force.strength);
    remainingHits -= forceHits;

    if (force.kind === "npr") {
      if (forceHits >= force.strength) {
        logEvent(G, `${force.realm}'s Grand Army contingent is wiped out`);
      }
      continue;
    }

    // Mixed forces use aerial apportionment so a Skyship can absorb an odd
    // hit at its stated one-hit capacity. Troop-only forces use ground rules.
    const losses = apportionBattleLosses(
      {
        regiments: force.regiments,
        levies: force.levies,
        skyships: force.skyships,
        eliteRegiments: 0,
      },
      forceHits,
      force.skyships > 0 ? "aerial" : "ground"
    );
    const resources = G.playerInfo[force.playerID].resources;
    resources.regiments = Math.max(
      0,
      resources.regiments - losses.regiments
    );
    resources.levies = Math.max(0, resources.levies - losses.levies);
    resources.skyships = Math.max(
      0,
      resources.skyships - losses.skyships
    );
    if (
      losses.regiments + losses.levies + losses.skyships >
      0
    ) {
      logEvent(
        G,
        `${G.playerInfo[force.playerID].kingdomName} loses ${losses.regiments} regiment(s), ${losses.levies} levy/levies and ${losses.skyships} skyship(s)`
      );
    }
  }
};

const applyShame = (
  G: MyGameState,
  contributions: PlayerContribution[]
): void => {
  for (const contribution of contributions) {
    // Skyships are part of unitCount, so a fleet-only contributor is not
    // shamed by the Grand Army amendment.
    if (contribution.unitCount !== 0) continue;
    if (
      G.playerInfo[contribution.playerID].hereticOrOrthodox ===
      "orthodox"
    ) {
      increaseHeresyWithinMove(G, contribution.playerID);
    } else {
      increaseOrthodoxyWithinMove(G, contribution.playerID);
    }
  }
};

const returnInvasionCounters = (
  G: MyGameState,
  shuffle: Shuffle
): void => {
  for (const host of G.accumulatedHosts) {
    if (!host.isFleet) {
      returnInfidelHostCounter(G, host, shuffle);
    }
  }
  G.accumulatedHosts = [];

  const contingents = G.currentInvasion?.nprContingents ?? [];
  for (const contingent of contingents) {
    returnContingentCounter(G, contingent.swords, shuffle);
  }
  if (G.currentInvasion) G.currentInvasion.nprContingents = [];

  if (G.infidelFleet?.destroyed) {
    returnDestroyedInfidelFleet(G, shuffle);
  } else if (G.infidelFleet) {
    G.infidelFleet.location = [...INFIDEL_EMPIRE_LOCATION];
  }
};

const resolveGroundCombat = (
  G: MyGameState,
  shuffle: Shuffle,
  captainFoW?: { sword: number; shield: number }
): InvasionAdvanceResult => {
  const invasion = G.currentInvasion;
  if (!invasion) return { status: "victory" };

  const captainGeneral = getCaptainGeneral(G);
  const contributions = getContributions(G);
  const playerStrength = contributions.reduce(
    (sum, contribution) =>
      sum +
      contribution.regiments * 2 +
      contribution.levies +
      (invasion.survivingSkyships?.[contribution.playerID] ?? 0),
    0
  );
  const playerShields = contributions.reduce(
    (sum, contribution) =>
      sum + (invasion.survivingSkyships?.[contribution.playerID] ?? 0),
    0
  );
  const nprStrength = (invasion.nprContingents ?? []).reduce(
    (sum, contingent) => sum + contingent.swords,
    0
  );
  const grandArmyStrength = playerStrength + nprStrength;
  const hostStrength = G.accumulatedHosts.reduce(
    (sum, host) => sum + (host.isFleet ? 0 : host.swords),
    0
  );
  const hostShields = G.accumulatedHosts.reduce(
    (sum, host) => sum + (host.isFleet ? 0 : host.shields),
    0
  );
  const hostFoW = drawCombatCard(G, shuffle);
  const armyFoW = captainFoW ?? drawCombatCard(G, shuffle);

  const { hitsOnDefender: hitsOnHost, hitsOnAttacker: hitsOnArmy } =
    calculateCombat(
      {
        swords: grandArmyStrength,
        shields: playerShields,
        fowSword: armyFoW.sword,
        fowShield: armyFoW.shield,
      },
      {
        swords: hostStrength,
        shields: hostShields,
        fowSword: hostFoW.sword,
        fowShield: hostFoW.shield,
      }
    );

  // eots42:520: unlike an ordinary ground attack, the Grand Army wins merely
  // by surviving; it does not have to annihilate the Host.
  const grandArmyWins = grandArmyStrength > hitsOnArmy;
  const captainKingdom =
    G.playerInfo[captainGeneral]?.kingdomName ?? "Unknown";
  let buyoffCost = 0;

  logEvent(
    G,
    `Captain-General: ${captainKingdom} | Grand Army: ${grandArmyStrength}S vs Infidel: ${hostStrength}S`
  );

  if (grandArmyWins) {
    logEvent(G, "Grand Army of the Faith is victorious!");
    applyVictoryRewards(G, captainGeneral);
    applyVictoryCasualties(G, hitsOnArmy, contributions);
  } else {
    buyoffCost = Math.max(0, hostStrength - hitsOnHost);
    logEvent(
      G,
      `Grand Army defeated! Buy-off cost: ${buyoffCost} Gold`
    );
    applyDefeatVPPenalties(G, captainGeneral);
    // eots42:520: strength less than or equal to hits annihilates the Grand
    // Army, including every player unit still present in its ground host.
    applyDefeatCasualties(G, contributions);
  }

  G.battleResult = {
    battleType: "Infidel Invasion",
    attackerName: "Infidel Host",
    defenderName: "Grand Army of the Faith",
    attackerSwords: hostStrength,
    attackerShields: hostShields,
    defenderSwords: grandArmyStrength,
    defenderShields: playerShields,
    attackerFoW: hostFoW,
    defenderFoW: armyFoW,
    attackerLosses:
      hitsOnHost > 0 ? `${hitsOnHost} hits inflicted` : "none",
    defenderLosses:
      hitsOnArmy > 0 ? `${hitsOnArmy} hits inflicted` : "none",
    winner: grandArmyWins ? "Grand Army" : "Infidel Host",
    outcome: grandArmyWins
      ? `Grand Army survives! Captain-General ${captainKingdom} +3 VP`
      : `Grand Army defeated! Buy-off: ${buyoffCost} Gold`,
  };

  applyShame(G, contributions);
  returnInvasionCounters(G, shuffle);

  if (grandArmyWins) {
    G.currentInvasion = null;
    return { status: "victory" };
  }

  invasion.phase = "buyoff";
  invasion.buyoffCost = buyoffCost;
  invasion.buyoffOffered = {};
  G.step = "invasion_buyoff";
  return { status: "defeat", buyoffCost };
};

const advanceToGroundCombat = (
  G: MyGameState,
  shuffle: Shuffle
): InvasionAdvanceResult => {
  if (hasCaptainGeneralHandCard(G)) {
    return awaitCaptainGeneralFoW(G, "ground_fow");
  }
  return resolveGroundCombat(G, shuffle);
};

/**
 * Close contributions, draw one contingent for each non-player Kingdom slot,
 * freeze player force rankings by unit count, and enter combat.
 */
export const beginGrandArmyBattle = (
  G: MyGameState,
  shuffle: Shuffle
): InvasionAdvanceResult => {
  const invasion = G.currentInvasion;
  if (!invasion) return { status: "victory" };

  const contributions = getContributions(G);
  invasion.forceRanking = rankPlayerForces(contributions);
  setupNprContingents(G);
  invasion.survivingSkyships = Object.fromEntries(
    contributions.map((contribution) => [
      contribution.playerID,
      contribution.skyships,
    ])
  );

  const fleetWingStrength = contributions.reduce(
    (sum, contribution) => sum + contribution.skyships,
    0
  );
  const activeInfidelFleet =
    G.infidelFleet !== null &&
    !G.infidelFleet.destroyed &&
    G.infidelFleet.active;

  if (activeInfidelFleet && fleetWingStrength > 0) {
    if (hasCaptainGeneralHandCard(G)) {
      return awaitCaptainGeneralFoW(G, "aerial_fow");
    }
    resolveAerialCombat(G, shuffle);
  } else {
    invasion.aerialOutcome = "skipped";
    if (G.infidelFleet?.destroyed) {
      returnDestroyedInfidelFleet(G, shuffle);
    }
  }

  return advanceToGroundCombat(G, shuffle);
};

/**
 * Resolve the currently pending Captain-General FoW choice. An omitted card
 * means "draw"; validation of the hand index / draw token belongs to the move.
 */
export const resolveInvasionFoWChoice = (
  G: MyGameState,
  shuffle: Shuffle,
  captainFoW?: { sword: number; shield: number }
): InvasionAdvanceResult => {
  const phase = G.currentInvasion?.phase;
  if (phase === "aerial_fow") {
    resolveAerialCombat(G, shuffle, captainFoW);
    return advanceToGroundCombat(G, shuffle);
  }
  if (phase === "ground_fow") {
    return resolveGroundCombat(G, shuffle, captainFoW);
  }
  return { status: "victory" };
};

/**
 * Apply the buy-off gold and shortfall VP penalties.
 * Called from the offerBuyoffGold move after all players have offered.
 */
export const applyBuyoff = (G: MyGameState): void => {
  const invasion = G.currentInvasion;
  if (
    !invasion ||
    invasion.buyoffCost === undefined ||
    !invasion.buyoffOffered
  ) {
    return;
  }

  const offered = invasion.buyoffOffered;
  for (const playerID of G.turnOrder) {
    G.playerInfo[playerID].resources.gold -= offered[playerID] ?? 0;
  }

  const totalOffered = Object.values(offered).reduce(
    (sum, amount) => sum + amount,
    0
  );
  const shortfall = invasion.buyoffCost - totalOffered;
  logEvent(
    G,
    `Buy-off: ${totalOffered} Gold offered of ${invasion.buyoffCost} required`
  );

  if (shortfall > 0) {
    logEvent(
      G,
      `Shortfall: ${shortfall} Gold — VP penalties applied`
    );
    let remaining = shortfall;
    const ipo = new Map(
      G.turnOrder.map((playerID, index) => [playerID, index])
    );
    const byGold = [...G.turnOrder].sort(
      (a, b) =>
        (offered[a] ?? 0) - (offered[b] ?? 0) ||
        (ipo.get(a) ?? 0) - (ipo.get(b) ?? 0)
    );
    while (remaining > 0) {
      let anyDeducted = false;
      for (const playerID of byGold) {
        if (remaining <= 0) break;
        if (G.playerInfo[playerID].resources.victoryPoints > 0) {
          removeVPAmount(G, playerID, 1);
          remaining--;
          anyDeducted = true;
        }
      }
      if (!anyDeducted) break;
    }
  }

  G.currentInvasion = null;
};
