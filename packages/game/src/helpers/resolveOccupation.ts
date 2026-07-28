import type {
  FleetInfo,
  FortuneOfWarCardInfo,
  MyGameState,
} from "../types.js";
import type { EventsAPI } from "../types.js";
import { KINGDOM_LOCATION } from "../data/gameData.js";
import { apportionBattleLosses } from "./battleLosses.js";
import { calculateCombat } from "./combatMath.js";
import { returnOccupyingCounter } from "./counterPools.js";
import { fleetCombatValues } from "./fleetUtils.js";
import { drawFortuneOfWarCard } from "./helpers.js";
import {
  getOccupyingCounter,
  getOccupyingCounterCombat,
} from "./occupation.js";
import {
  computeGarrisonTroops,
} from "./resolveBattle.js";
import { findNextGroundBattle } from "./findNext.js";
import { clonePlayerInfo } from "./cloneUtils.js";
import {
  logEvent,
  toBuildingOwner,
} from "./stateUtils.js";

type Shuffle = <T>(items: T[]) => T[];

const fleetUnitCount = (fleet: FleetInfo): number =>
  fleet.skyships +
  fleet.regiments +
  fleet.levies +
  fleet.eliteRegiments;

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

const applyAttackerLosses = (
  G: MyGameState,
  playerID: string,
  tile: [number, number],
  fleets: FleetInfo[],
  hits: number
): string => {
  const force = fleets.reduce(
    (total, fleet) => ({
      levies: total.levies + fleet.levies,
      skyships: total.skyships + fleet.skyships,
      regiments: total.regiments + fleet.regiments,
      eliteRegiments:
        total.eliteRegiments + fleet.eliteRegiments,
    }),
    { levies: 0, skyships: 0, regiments: 0, eliteRegiments: 0 }
  );
  const losses = apportionBattleLosses(force, hits, "ground");
  const units = [
    "levies",
    "skyships",
    "regiments",
    "eliteRegiments",
  ] as const;
  for (const unit of units) {
    let remaining = losses[unit];
    for (const fleet of fleets) {
      if (remaining <= 0) break;
      const removed = Math.min(fleet[unit], remaining);
      fleet[unit] -= removed;
      remaining -= removed;
    }
  }
  fleets.forEach(trimFleetCapacity);

  for (const fleet of fleets) {
    if (fleetUnitCount(fleet) === 0) {
      fleet.location = [...KINGDOM_LOCATION];
      fleet.travelHistory = [];
    }
  }
  if (!fleets.some((fleet) => fleetUnitCount(fleet) > 0)) {
    const [x, y] = tile;
    const occupants = G.mapState.battleMap[y]?.[x];
    const index = occupants?.indexOf(playerID) ?? -1;
    if (index >= 0) occupants.splice(index, 1);
  }

  const labels: string[] = [];
  if (losses.levies) labels.push(`${losses.levies} levy`);
  if (losses.skyships) labels.push(`${losses.skyships} skyship`);
  if (losses.regiments) {
    labels.push(`${losses.regiments} regiment`);
  }
  if (losses.eliteRegiments) {
    labels.push(`${losses.eliteRegiments} elite`);
  }
  return labels.length > 0 ? labels.join(", ") : "none";
};

export const resolveOccupationBattle = (
  G: MyGameState,
  events: EventsAPI,
  shuffle: Shuffle,
  attackerFoW?: FortuneOfWarCardInfo
): void => {
  const battle = G.currentOccupationBattle;
  if (!battle) return;
  const {
    attackerPlayerID,
    tile: [x, y],
  } = battle;
  const building = G.mapState.buildings[y][x];
  const counter = getOccupyingCounter(building);
  if (!counter) {
    G.currentOccupationBattle = null;
    findNextGroundBattle(G, events);
    return;
  }

  const fleets = G.playerInfo[attackerPlayerID].fleetInfo.filter(
    (fleet) =>
      fleet.location[0] === x &&
      fleet.location[1] === y &&
      fleetUnitCount(fleet) > 0
  );
  const attackerBase = fleets.reduce(
    (total, fleet) => {
      const combat = fleetCombatValues(fleet);
      return {
        swords: total.swords + combat.swords,
        shields: total.shields + combat.shields,
      };
    },
    { swords: 0, shields: 0 }
  );
  const force = fleets.reduce(
    (total, fleet) => ({
      regiments: total.regiments + fleet.regiments,
      levies: total.levies + fleet.levies,
      skyships: total.skyships + fleet.skyships,
      eliteRegiments:
        total.eliteRegiments + fleet.eliteRegiments,
    }),
    { regiments: 0, levies: 0, skyships: 0, eliteRegiments: 0 }
  );
  const attackerHP =
    force.regiments * 2 +
    force.levies +
    force.skyships +
    force.eliteRegiments * 2;

  const playedFoW =
    attackerFoW ??
    drawFortuneOfWarCard(G, shuffle, { redrawNoEffect: false });
  let attackerFoWSword = playedFoW.sword;
  let attackerFoWShield = playedFoW.shield;
  if (
    attackerFoW &&
    G.playerInfo[attackerPlayerID].resources.advantageCard ===
      "improved_training"
  ) {
    if (attackerFoWSword > 0) attackerFoWSword += 1;
    if (attackerFoWShield > 0) attackerFoWShield += 1;
  }
  const counterFoW = drawFortuneOfWarCard(G, shuffle, {
    redrawNoEffect: false,
  });
  const counterCombat = getOccupyingCounterCombat(counter);
  const { hitsOnAttacker, hitsOnDefender: hitsOnCounter } =
    calculateCombat(
      {
        swords: attackerBase.swords,
        shields: attackerBase.shields,
        fowSword: attackerFoWSword,
        fowShield: attackerFoWShield,
      },
      {
        swords: counterCombat.swords,
        shields: counterCombat.shields,
        fowSword: counterFoW.sword,
        fowShield: counterFoW.shield,
      }
    );

  // The occupying counter is the defender and wins simultaneous elimination.
  const attackerWins =
    attackerHP > 0 &&
    hitsOnAttacker < attackerHP &&
    hitsOnCounter >= counterCombat.swords;
  const lossDetail = applyAttackerLosses(
    G,
    attackerPlayerID,
    [x, y],
    fleets,
    hitsOnAttacker
  );
  const attacker = G.playerInfo[attackerPlayerID];

  if (attackerWins) {
    returnOccupyingCounter(G, counter, shuffle);
    building.rebelCounter = undefined;
    // Occupied buildings have no defending garrison. Clear legacy saved
    // states created before seizure returned/removed those troops.
    building.garrisonedRegiments = 0;
    building.garrisonedLevies = 0;
    building.garrisonedEliteRegiments = 0;
    // Mirror today's ownership-transfer semantics. Yield-vs-claim remains a
    // separate open audit finding and is intentionally not redesigned here.
    building.player = toBuildingOwner(attacker);
    attacker.resources.victoryPoints += 1;
    logEvent(
      G,
      `${attacker.kingdomName} retakes the occupied ${building.buildings} (+1 VP)`
    );
  } else {
    logEvent(
      G,
      `${attacker.kingdomName} fails to retake the occupied ${building.buildings}`
    );
  }

  G.battleResult = {
    battleType: "Retake occupied building",
    attackerName: attacker.kingdomName,
    defenderName:
      counter.kind === "rebels" ? "Rebels" : "Infidel Host",
    attackerSwords: attackerBase.swords,
    attackerShields: attackerBase.shields,
    defenderSwords: counterCombat.swords,
    defenderShields: counterCombat.shields,
    attackerFoW: playedFoW,
    defenderFoW: counterFoW,
    attackerLosses: lossDetail,
    defenderLosses:
      hitsOnCounter > 0 ? `${hitsOnCounter} hits` : "none",
    winner: attackerWins
      ? attacker.kingdomName
      : counter.kind === "rebels"
        ? "Rebels"
        : "Infidel Host",
    outcome: attackerWins
      ? `${attacker.kingdomName} retakes the building`
      : `${attacker.kingdomName}'s ground attack fails`,
  };
  G.currentOccupationBattle = null;

  if (attackerWins) {
    G.battleState = {
      attacker: {
        ...clonePlayerInfo(attacker),
        decision: "fight",
        victorious: true,
      },
    } as NonNullable<MyGameState["battleState"]>;
    G.step = "ground_garrison";
    computeGarrisonTroops(G, attackerPlayerID);
    events.endTurn({ next: attackerPlayerID });
  } else {
    findNextGroundBattle(G, events);
  }
};
