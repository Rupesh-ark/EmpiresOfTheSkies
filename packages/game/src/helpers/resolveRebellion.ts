/**
 * Rebellion setup and battle resolution.
 *
 * Kingdom rebellions are resolved in the rebellions phase. Colonial
 * REBELLION is prepared and resolved from the ground-battle segment.
 */

import type {
  FleetInfo,
  FortuneOfWarCardInfo,
  MyGameState,
} from "../types.js";
import {
  addVPAmount,
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  logEvent,
} from "./stateUtils.js";
import { calculateCombat } from "./combatMath.js";
import { drawFortuneOfWarCard, hasFortAt } from "./helpers.js";
import { resolveCardWithAlignmentPenalty } from "./legacyCardDefinitions.js";
import { KINGDOM_LOCATION } from "../data/gameData.js";
import { apportionBattleLosses } from "./battleLosses.js";
import { returnContingentCounter } from "./counterPools.js";

type Shuffle = <T>(items: T[]) => T[];
type ActiveRebellion = NonNullable<MyGameState["currentRebellion"]>;
type Contribution =
  NonNullable<ActiveRebellion["rivalContributions"]>[string];

type Force = {
  regiments: number;
  levies: number;
  skyships: number;
  eliteRegiments: number;
};

const forceStrength = (force: Force): number =>
  force.regiments * 2 +
  force.levies +
  force.skyships +
  force.eliteRegiments * 3;

const forceShields = (force: Force): number => force.skyships;

const forceHitCapacity = (force: Force): number =>
  force.regiments * 2 +
  force.levies +
  force.skyships +
  force.eliteRegiments * 2;

const forceSize = (force: Force): number =>
  force.regiments +
  force.levies +
  force.skyships +
  force.eliteRegiments;

const contributionForce = (contribution: Contribution): Force => ({
  regiments: contribution.regiments,
  levies: contribution.levies,
  skyships: contribution.skyships,
  eliteRegiments: contribution.eliteRegiments,
});

const primaryForce = (rebellion: ActiveRebellion): Force => ({
  regiments: rebellion.defenderRegiments ?? 0,
  levies: rebellion.defenderLevies ?? 0,
  skyships: rebellion.defenderSkyships ?? 0,
  eliteRegiments: rebellion.defenderEliteRegiments ?? 0,
});

const lossMode = (force: Force): "aerial" | "ground" =>
  // A committed Skyship absorbs one hit. Troop-only forces retain the ground
  // odd-hit rule.
  force.skyships > 0 ? "aerial" : "ground";

const applyLossesToForce = (force: Force, hits: number): Force => {
  const losses = apportionBattleLosses(force, hits, lossMode(force));
  return {
    regiments: losses.regiments,
    levies: losses.levies,
    skyships: losses.skyships,
    eliteRegiments: losses.eliteRegiments,
  };
};

const reduceContribution = (
  contribution: Contribution,
  losses: Force
): void => {
  contribution.regiments -= losses.regiments;
  contribution.levies -= losses.levies;
  contribution.skyships -= losses.skyships;
  contribution.eliteRegiments -= losses.eliteRegiments;
};

const trimFleetCapacity = (fleet: FleetInfo): void => {
  while (
    fleet.regiments + fleet.levies + fleet.eliteRegiments >
    fleet.skyships
  ) {
    if (fleet.levies > 0) fleet.levies -= 1;
    else if (fleet.regiments > 0) fleet.regiments -= 1;
    else if (fleet.eliteRegiments > 0) fleet.eliteRegiments -= 1;
    else break;
  }
};

const applyFleetContributionLosses = (
  G: MyGameState,
  playerID: string,
  tile: [number, number],
  losses: Force
): void => {
  const [x, y] = tile;
  const fleets = G.playerInfo[playerID].fleetInfo.filter(
    (fleet) => fleet.location[0] === x && fleet.location[1] === y
  );
  const unitOrder: (keyof Force)[] = [
    "levies",
    "skyships",
    "regiments",
    "eliteRegiments",
  ];

  for (const unit of unitOrder) {
    let remaining = losses[unit];
    for (const fleet of fleets) {
      if (remaining <= 0) break;
      const removed = Math.min(fleet[unit], remaining);
      fleet[unit] -= removed;
      remaining -= removed;
    }
  }
  fleets.forEach(trimFleetCapacity);

  const anySurvivors = fleets.some(
    (fleet) =>
      fleet.skyships +
        fleet.regiments +
        fleet.levies +
        fleet.eliteRegiments >
      0
  );
  for (const fleet of fleets) {
    if (
      fleet.skyships +
        fleet.regiments +
        fleet.levies +
        fleet.eliteRegiments ===
      0
    ) {
      fleet.location = [...KINGDOM_LOCATION];
      fleet.travelHistory = [];
    }
  }
  if (!anySurvivors) {
    const occupants = G.mapState.battleMap[y]?.[x];
    const index = occupants?.indexOf(playerID) ?? -1;
    if (index >= 0) occupants.splice(index, 1);
  }
};

const applyPrimaryLosses = (
  G: MyGameState,
  rebellion: ActiveRebellion,
  hits: number
): Force => {
  const force = primaryForce(rebellion);
  const losses = applyLossesToForce(force, hits);
  const { event } = rebellion;

  if (event.card === "colonial_rebellion" && event.targetTile) {
    const [x, y] = event.targetTile;
    const building = G.mapState.buildings[y][x];
    building.garrisonedRegiments -= losses.regiments;
    building.garrisonedLevies -= losses.levies;
    building.garrisonedEliteRegiments -= losses.eliteRegiments;
  } else {
    const resources = G.playerInfo[event.targetPlayerID].resources;
    // Only the selected commitment is apportioned, so these deductions can
    // never spill into the uncommitted Kingdom reserve.
    resources.regiments -= losses.regiments;
    resources.levies -= losses.levies;
    resources.skyships -= losses.skyships;
  }

  return losses;
};

const applyContributionLosses = (
  G: MyGameState,
  rebellion: ActiveRebellion,
  playerID: string,
  contribution: Contribution,
  hits: number
): Force => {
  const losses = applyLossesToForce(contributionForce(contribution), hits);
  reduceContribution(contribution, losses);
  if (
    contribution.source === "fleet" &&
    rebellion.event.targetTile
  ) {
    applyFleetContributionLosses(
      G,
      playerID,
      rebellion.event.targetTile,
      losses
    );
  }
  return losses;
};

const orderedContributions = (
  G: MyGameState,
  rebellion: ActiveRebellion,
  side: "defender" | "rebel"
): [string, Contribution][] => {
  const ipo = new Map(
    G.turnOrder.map((playerID, index) => [playerID, index])
  );
  return Object.entries(rebellion.rivalContributions ?? {})
    .filter(([, contribution]) => contribution.side === side)
    .sort(
      ([aID, a], [bID, b]) =>
        forceSize(contributionForce(b)) -
          forceSize(contributionForce(a)) ||
        (ipo.get(aID) ?? Number.MAX_SAFE_INTEGER) -
          (ipo.get(bID) ?? Number.MAX_SAFE_INTEGER)
    );
};

const returnKingdomContributionSurvivors = (
  G: MyGameState,
  rebellion: ActiveRebellion
): void => {
  for (const [playerID, contribution] of Object.entries(
    rebellion.rivalContributions ?? {}
  )) {
    if (contribution.source !== "kingdom") continue;
    const resources = G.playerInfo[playerID].resources;
    resources.regiments += contribution.regiments;
    resources.levies += contribution.levies;
    resources.skyships += contribution.skyships;
    resources.eliteRegiments += contribution.eliteRegiments;
  }
};

export const hasOfferedDefenderSupport = (
  rebellion: ActiveRebellion
): boolean =>
  Object.values(rebellion.rivalContributions ?? {}).some(
    (contribution) =>
      contribution.side === "defender" &&
      forceSize(contributionForce(contribution)) > 0
  );

export const refuseDefenderSupport = (
  G: MyGameState,
  rebellion: ActiveRebellion
): void => {
  for (const [playerID, contribution] of Object.entries(
    rebellion.rivalContributions ?? {}
  )) {
    if (contribution.side !== "defender") continue;
    if (contribution.source === "kingdom") {
      const resources = G.playerInfo[playerID].resources;
      resources.regiments += contribution.regiments;
      resources.levies += contribution.levies;
      resources.skyships += contribution.skyships;
      resources.eliteRegiments += contribution.eliteRegiments;
    }
    delete rebellion.rivalContributions![playerID];
  }
  rebellion.defenderSupportAccepted = false;
};

const returnColonialGarrison = (
  G: MyGameState,
  targetPlayerID: string,
  tile: [number, number]
): void => {
  const [x, y] = tile;
  const building = G.mapState.buildings[y][x];
  const resources = G.playerInfo[targetPlayerID].resources;
  resources.regiments += building.garrisonedRegiments;
  resources.levies += building.garrisonedLevies;
  resources.eliteRegiments += building.garrisonedEliteRegiments;
  building.garrisonedRegiments = 0;
  building.garrisonedLevies = 0;
  building.garrisonedEliteRegiments = 0;
};

const resolvePretenderRebellion = (
  G: MyGameState,
  targetID: string,
  defenderWins: boolean,
  shuffle: Shuffle
): void => {
  if (defenderWins) {
    addVPAmount(G, targetID, 1);
    return;
  }

  const player = G.playerInfo[targetID];
  const currentCard = player.resources.legacyCard;
  if (currentCard) {
    resolveCardWithAlignmentPenalty(player, G, currentCard);
    G.cardDecks.legacyDeck.push(currentCard);
    player.resources.legacyCard = undefined;
  }
  if (G.cardDecks.legacyDeck.length > 0) {
    G.cardDecks.legacyDeck = shuffle(G.cardDecks.legacyDeck);
    player.resources.legacyCard = G.cardDecks.legacyDeck.pop()!;
  }
};

const applyOutcome = (
  G: MyGameState,
  rebellion: ActiveRebellion,
  defenderWins: boolean,
  shuffle: Shuffle
): void => {
  const {
    event: { card, targetPlayerID, targetTile },
    counterSwords,
  } = rebellion;

  switch (card) {
    case "pretender_rebellion":
      resolvePretenderRebellion(
        G,
        targetPlayerID,
        defenderWins,
        shuffle
      );
      break;
    case "peasant_rebellion":
      if (defenderWins) {
        addVPAmount(G, targetPlayerID, 1);
      } else if (
        !G.eventState.skipTaxesNextRound.includes(targetPlayerID)
      ) {
        G.eventState.skipTaxesNextRound.push(targetPlayerID);
      }
      break;
    case "orthodox_rebellion":
      if (defenderWins) {
        addVPAmount(G, targetPlayerID, 1);
        increaseOrthodoxyWithinMove(G, targetPlayerID);
      } else {
        G.playerInfo[targetPlayerID].hereticOrOrthodox = "orthodox";
        G.playerInfo[targetPlayerID].prisoners = 0;
        G.eventState.cannotConvertThisRound.push(targetPlayerID);
      }
      break;
    case "heretic_rebellion":
      if (defenderWins) {
        addVPAmount(G, targetPlayerID, 1);
        increaseHeresyWithinMove(G, targetPlayerID);
      } else {
        G.playerInfo[targetPlayerID].hereticOrOrthodox = "heretic";
        G.playerInfo[targetPlayerID].prisoners = 0;
        G.eventState.cannotConvertThisRound.push(targetPlayerID);
      }
      break;
    case "colonial_rebellion":
      if (defenderWins) {
        addVPAmount(G, targetPlayerID, 1);
      } else if (targetTile) {
        returnColonialGarrison(G, targetPlayerID, targetTile);
        const [x, y] = targetTile;
        G.mapState.buildings[y][x].rebelCounter = {
          kind: "rebels",
          swords: counterSwords,
        };
      }
      break;
  }

  if (card !== "colonial_rebellion" || defenderWins) {
    returnContingentCounter(G, counterSwords, shuffle);
  }
};

const resolveBattle = (
  G: MyGameState,
  rebellion: ActiveRebellion,
  shuffle: Shuffle
): void => {
  const { event, counterSwords } = rebellion;
  const target = G.playerInfo[event.targetPlayerID];
  const defender = primaryForce(rebellion);

  // eots42:75: declining the selected force ends the procedure before rival
  // assistance. For Colonial REBELLION the selected force is the garrison.
  if (forceSize(defender) === 0) {
    logEvent(
      G,
      `${target.kingdomName} surrenders — rebels win automatically`
    );
    applyOutcome(G, rebellion, false, shuffle);
    returnKingdomContributionSurvivors(G, rebellion);
    return;
  }

  const defenderAllies = orderedContributions(
    G,
    rebellion,
    "defender"
  );
  const rebelAllies = orderedContributions(G, rebellion, "rebel");
  const defenderForces = [
    defender,
    ...defenderAllies.map(([, contribution]) =>
      contributionForce(contribution)
    ),
  ];
  const rebelForces = rebelAllies.map(([, contribution]) =>
    contributionForce(contribution)
  );

  const fortPresent =
    event.card === "colonial_rebellion" && event.targetTile
      ? hasFortAt(G, event.targetTile[0], event.targetTile[1])
      : hasFortAt(G, KINGDOM_LOCATION[0], KINGDOM_LOCATION[1]);

  const totalDefenderSwords = defenderForces.reduce(
    (sum, force) => sum + forceStrength(force),
    0
  );
  const totalRebelSwords =
    counterSwords +
    rebelForces.reduce((sum, force) => sum + forceStrength(force), 0);

  // eots42:80 says Regiment; the quick-reference footnote at eots42:678 says
  // defending Regiment or Levy. Preserve the engine's levy-inclusive reading.
  // Elite Regiments are Regiments; Fleet-borne assistance does not receive a
  // Fort shield.
  const fortShields = (force: Force): number =>
    fortPresent
      ? force.regiments +
        force.levies +
        force.eliteRegiments
      : 0;
  let totalFortShields = fortShields(defender);
  for (const [, contribution] of defenderAllies) {
    if (contribution.source === "kingdom") {
      totalFortShields += fortShields(
        contributionForce(contribution)
      );
    }
  }

  const defenderShields =
    totalFortShields +
    defenderForces.reduce((sum, force) => sum + forceShields(force), 0);
  const rebelShields = rebelForces.reduce(
    (sum, force) => sum + forceShields(force),
    0
  );

  const rebelFoW = drawFortuneOfWarCard(G, shuffle, {
    redrawNoEffect: false,
  });
  const defenderFoW =
    rebellion.fowCard ??
    drawFortuneOfWarCard(G, shuffle, { redrawNoEffect: false });

  const {
    hitsOnDefender,
    hitsOnAttacker: hitsOnRebels,
  } = calculateCombat(
    {
      swords: totalRebelSwords,
      shields: rebelShields,
      fowSword: rebelFoW.sword,
      fowShield: rebelFoW.shield,
    },
    {
      swords: totalDefenderSwords,
      shields: defenderShields,
      fowSword: defenderFoW.sword,
      fowShield: defenderFoW.shield,
    }
  );

  const defenderHP = defenderForces.reduce(
    (sum, force) => sum + forceHitCapacity(force),
    0
  );
  const rebelHP =
    counterSwords +
    rebelForces.reduce(
      (sum, force) => sum + forceHitCapacity(force),
      0
    );
  const rebelsEliminated = hitsOnRebels >= rebelHP;
  const defendersEliminated = hitsOnDefender >= defenderHP;
  const defenderWins = !defendersEliminated || rebelsEliminated;

  // eots42:81: the selected defender and its allies form one loss pool,
  // ranked largest-to-smallest with ties resolved in IPO.
  const ipo = new Map(
    G.turnOrder.map((playerID, index) => [playerID, index])
  );
  const defenderLossOrder: {
    playerID: string;
    force: Force;
    contribution?: Contribution;
  }[] = [
    {
      playerID: event.targetPlayerID,
      force: defender,
    },
    ...defenderAllies.map(([playerID, contribution]) => ({
      playerID,
      force: contributionForce(contribution),
      contribution,
    })),
  ];
  defenderLossOrder.sort(
    (a, b) =>
      forceSize(b.force) -
        forceSize(a.force) ||
      (ipo.get(a.playerID) ?? Number.MAX_SAFE_INTEGER) -
        (ipo.get(b.playerID) ?? Number.MAX_SAFE_INTEGER)
  );

  let remainingDefenderHits = hitsOnDefender;
  for (const entry of defenderLossOrder) {
    if (remainingDefenderHits <= 0) break;
    const forceHits = Math.min(
      remainingDefenderHits,
      forceHitCapacity(entry.force)
    );
    if (entry.contribution) {
      applyContributionLosses(
        G,
        rebellion,
        entry.playerID,
        entry.contribution,
        forceHits
      );
    } else {
      applyPrimaryLosses(G, rebellion, forceHits);
    }
    remainingDefenderHits -= forceHits;
  }

  // Rebel losses fall on the printed counter first, then external forces in
  // the same largest-to-smallest order.
  let remainingRebelHits = Math.max(0, hitsOnRebels - counterSwords);
  for (const [playerID, contribution] of rebelAllies) {
    if (remainingRebelHits <= 0) break;
    const contributionHits = Math.min(
      remainingRebelHits,
      forceHitCapacity(contributionForce(contribution))
    );
    applyContributionLosses(
      G,
      rebellion,
      playerID,
      contribution,
      contributionHits
    );
    remainingRebelHits -= contributionHits;
  }

  logEvent(
    G,
    defenderWins
      ? `${target.kingdomName} defeats the rebels!`
      : `Rebels overwhelm ${target.kingdomName}'s defenders!`
  );

  G.battleResult = {
    battleType:
      event.card === "colonial_rebellion"
        ? "Colonial Rebellion"
        : "Rebellion",
    attackerName: "Rebels",
    defenderName: target.kingdomName,
    attackerSwords: totalRebelSwords,
    attackerShields: rebelShields,
    defenderSwords: totalDefenderSwords,
    defenderShields,
    attackerFoW: rebelFoW,
    defenderFoW,
    attackerLosses:
      hitsOnRebels > 0 ? `${hitsOnRebels} hits absorbed` : "none",
    defenderLosses:
      hitsOnDefender > 0
        ? `${hitsOnDefender} hits absorbed`
        : "none",
    winner: defenderWins ? target.kingdomName : "Rebels",
    outcome: defenderWins
      ? `${target.kingdomName} defeats the rebels!`
      : `Rebels overwhelm ${target.kingdomName}!`,
  };

  applyOutcome(G, rebellion, defenderWins, shuffle);
  // eots42:81: every surviving external force returns, including allies on
  // the losing side. Fleet contributions remain in their original Fleets.
  returnKingdomContributionSurvivors(G, rebellion);
};

/**
 * Find the next Kingdom rebellion, draw its counter, and enter commitment.
 * Colonial REBELLION is deliberately left for the ground-battle segment.
 */
export const setupNextRebellion = (G: MyGameState): boolean => {
  const index = G.eventState.deferredEvents.findIndex(
    (event) =>
      event.card.endsWith("_rebellion") &&
      event.card !== "colonial_rebellion"
  );
  if (index === -1) return false;

  const event = G.eventState.deferredEvents.splice(index, 1)[0];
  if (G.contingentPool.length === 0) {
    logEvent(G, "No contingent counters left — rebellion cannot occur");
    return false;
  }

  const counterSwords = G.contingentPool.pop()!;
  logEvent(
    G,
    `Rebellion in ${G.playerInfo[event.targetPlayerID].kingdomName}! Rebel force: ${counterSwords} swords`
  );
  G.currentRebellion = { event, counterSwords };
  return true;
};

export const getColonialRebellionRival = (
  G: MyGameState,
  event: ActiveRebellion["event"]
): string | null => {
  if (!event.targetTile) return null;
  const [x, y] = event.targetTile;
  const rivals = G.turnOrder.filter(
    (playerID) =>
      playerID !== event.targetPlayerID &&
      G.playerInfo[playerID].fleetInfo.some(
        (fleet) =>
          fleet.location[0] === x &&
          fleet.location[1] === y &&
          fleet.skyships > 0
      )
  );
  // eots42:79: assistance is available only when no other rival Fleet is
  // present. Multiple Fleets belonging to the sole rival form one force.
  return rivals.length === 1 ? rivals[0] : null;
};

/** Prepare the selected colony's garrison and rebel counter for ground combat. */
export const setupColonialRebellion = (
  G: MyGameState,
  event: ActiveRebellion["event"]
): ActiveRebellion | null => {
  if (!event.targetTile || G.contingentPool.length === 0) return null;
  const [x, y] = event.targetTile;
  const building = G.mapState.buildings[y][x];
  const rebellion: ActiveRebellion = {
    event,
    counterSwords: G.contingentPool.pop()!,
    defenderRegiments: building.garrisonedRegiments,
    defenderLevies: building.garrisonedLevies,
    defenderSkyships: 0,
    defenderEliteRegiments: building.garrisonedEliteRegiments,
    rivalContributions: {},
    eligibleRivals: [],
  };
  const rival = getColonialRebellionRival(G, event);
  if (rival) rebellion.eligibleRivals = [rival];
  G.currentRebellion = rebellion;
  logEvent(
    G,
    `Colonial Rebellion at ${G.mapState.currentTileArray[y][x].name}! Rebel force: ${rebellion.counterSwords} swords`
  );
  return rebellion;
};

export const resolveRebellionWithTroops = (
  G: MyGameState,
  rebellion: ActiveRebellion,
  regiments: number,
  levies: number,
  skyships: number,
  shuffle: Shuffle
): void => {
  rebellion.defenderRegiments = regiments;
  rebellion.defenderLevies = levies;
  rebellion.defenderSkyships = skyships;
  rebellion.defenderEliteRegiments = 0;
  resolveBattle(G, rebellion, shuffle);
};

export const resolveRebellionWithTroopsAndRivals = (
  G: MyGameState,
  rebellion: ActiveRebellion,
  shuffle: Shuffle
): void => {
  resolveBattle(G, rebellion, shuffle);
};
