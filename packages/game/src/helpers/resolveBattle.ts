import { Ctx } from "boardgame.io";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { FleetInfo, GoodKey, MyGameState, PlayerInfo } from "../types";
// findNext functions no longer called directly — resolutionSequencer handles all transitions
import { drawFortuneOfWarCard, findPossibleDestinations } from "./helpers";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { increaseHeresyWithinMove, increaseOrthodoxyWithinMove, logEvent } from "./stateUtils";
import { PRICE_MARKER_MIN, KINGDOM_LOCATION } from "../data/gameData";
import { nextAfterAerialDecision, nextAfterGroundDecision, nextAfterConquest } from "./resolutionSequencer";
import { setStage } from "./stageUtils";
import { calculateCombat } from "./combatMath";

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

// NaN/Null Sanitization Helpers

function sanitizeFleet(fleet: FleetInfo, context: string = ""): FleetInfo {
  const hasNaN = typeof fleet.levies !== 'number' || isNaN(fleet.levies) ||
                 typeof fleet.regiments !== 'number' || isNaN(fleet.regiments) ||
                 typeof fleet.skyships !== 'number' || isNaN(fleet.skyships) ||
                 typeof fleet.eliteRegiments !== 'number' || isNaN(fleet.eliteRegiments);
  if (hasNaN) {
    console.warn(`[resolveBattle] Invalid value detected in fleet${context ? ` at ${context}` : ""}:`, {
      fleetId: fleet.fleetId,
      location: fleet.location,
      skyships: fleet.skyships,
      regiments: fleet.regiments,
      levies: fleet.levies,
      eliteRegiments: fleet.eliteRegiments,
    });
    fleet.levies = typeof fleet.levies === 'number' && !isNaN(fleet.levies) ? fleet.levies : 0;
    fleet.regiments = typeof fleet.regiments === 'number' && !isNaN(fleet.regiments) ? fleet.regiments : 0;
    fleet.skyships = typeof fleet.skyships === 'number' && !isNaN(fleet.skyships) ? fleet.skyships : 0;
    fleet.eliteRegiments = typeof fleet.eliteRegiments === 'number' && !isNaN(fleet.eliteRegiments) ? fleet.eliteRegiments : 0;
  }
  return fleet;
}

function sanitizePlayerResources(player: PlayerInfo, context: string = ""): void {
  const r = player.resources;
  const issues: string[] = [];
  
  if (typeof r.levies !== 'number' || isNaN(r.levies) || r.levies === null) {
    issues.push(`levies=${r.levies}`);
    r.levies = typeof r.levies === 'number' && !isNaN(r.levies) ? r.levies : 0;
  }
  if (typeof r.regiments !== 'number' || isNaN(r.regiments) || r.regiments === null) {
    issues.push(`regiments=${r.regiments}`);
    r.regiments = typeof r.regiments === 'number' && !isNaN(r.regiments) ? r.regiments : 0;
  }
  if (typeof r.skyships !== 'number' || isNaN(r.skyships) || r.skyships === null) {
    issues.push(`skyships=${r.skyships}`);
    r.skyships = typeof r.skyships === 'number' && !isNaN(r.skyships) ? r.skyships : 0;
  }
  if (issues.length > 0) {
    console.warn(`[resolveBattle] Invalid player resources${context ? ` at ${context}` : ""}: ${issues.join(", ")}`);
  }
}

/** Compute troops available for garrisoning at a battle tile from a player's fleets. */
const computeGarrisonTroops = (G: MyGameState, playerID: string): void => {
  const [x, y] = G.mapState.currentBattle;
  let regiments = 0, elites = 0, levies = 0;
  
  // Sanitize player resources first
  const player = G.playerInfo[playerID];
  if (player) {
    sanitizePlayerResources(player, `computeGarrisonTroops player ${playerID}`);
  }
  
  G.playerInfo[playerID]?.fleetInfo.forEach((fleet) => {
    if (fleet.location[0] === x && fleet.location[1] === y) {
      // Sanitize fleet values before using them
      sanitizeFleet(fleet, `computeGarrisonTroops [${x},${y}]`);
      regiments += fleet.regiments;
      elites += fleet.eliteRegiments;
      levies += fleet.levies;
    }
  });
  G.troopsAvailableForGarrison = { regiments, elites, levies };
};


function formatLosses(losses: { levies: number; regiments: number; eliteRegiments: number; skyships: number }): string {
  const parts: string[] = [];
  if (losses.levies > 0) parts.push(`${losses.levies} ${losses.levies === 1 ? 'levy' : 'levies'}`);
  if (losses.regiments > 0) parts.push(`${losses.regiments} ${losses.regiments === 1 ? 'regiment' : 'regiments'}`);
  if (losses.eliteRegiments > 0) parts.push(`${losses.eliteRegiments} elite`);
  if (losses.skyships > 0) parts.push(`${losses.skyships} ${losses.skyships === 1 ? 'skyship' : 'skyships'}`);
  return parts.length > 0 ? parts.join(', ') : 'none';
}

function snapshotFleets(fleets: FleetInfo[]): { levies: number; regiments: number; eliteRegiments: number; skyships: number } {
  let levies = 0, regiments = 0, eliteRegiments = 0, skyships = 0;
  for (const f of fleets) {
    // Sanitize fleet values before using them
    sanitizeFleet(f, "snapshotFleets");
    levies += f.levies;
    regiments += f.regiments;
    eliteRegiments += f.eliteRegiments ?? 0;
    skyships += f.skyships;
  }
  return { levies, regiments, eliteRegiments, skyships };
}


/**
 * Calculates sword value, shield value, and fleet list for all of a player's
 * fleets located at (x, y).  Does NOT include FoW card bonuses — those are
 * battle-type-specific and must be added by the caller.
 */
const calcFleetCombatValues = (
  playerFleets: FleetInfo[],
  x: number,
  y: number
): { swordValue: number; shieldValue: number; fleets: FleetInfo[] } => {
  let swordValue = 0;
  let shieldValue = 0;
  const fleets: FleetInfo[] = [];
  playerFleets.forEach((fleet) => {
    if (fleet.location[0] === x && fleet.location[1] === y) {
      swordValue += fleet.skyships + fleet.levies + fleet.regiments * 2 + fleet.eliteRegiments * 3;
      shieldValue += fleet.skyships;
      fleets.push(fleet);
    }
  });
  return { swordValue, shieldValue, fleets };
};

/** Total unit count across all unit types for a single fleet. */
const fleetUnitCount = (fleet: FleetInfo): number =>
  fleet.regiments + fleet.levies + fleet.skyships + fleet.eliteRegiments;

/**
 * Trims troops that exceed skyship carrying capacity after losses have been
 * applied.  Priority: levies first, then regiments, then elites.
 */
const trimFleetCapacity = (fleet: FleetInfo): void => {
  while (fleet.regiments + fleet.levies + fleet.eliteRegiments > fleet.skyships) {
    if (fleet.levies > 0) {
      fleet.levies -= 1;
    } else if (fleet.regiments > 0) {
      fleet.regiments -= 1;
    } else if (fleet.eliteRegiments > 0) {
      fleet.eliteRegiments -= 1;
    } else {
      break;
    }
  }
};

/**
 * Applies `totalLosses` hit-points to a list of fleets using standard loss
 * priority (odd-hit rule → levies → outnumbering skyships → regiments →
 * elites) and then trims each fleet to skyship capacity.
 *
 * @param applyOddHitRule  Pass `true` for aerial/ground fleet combats.
 *                         Pass `false` for conquest (garrison absorbs first,
 *                         no odd-hit parity requirement on the fleet portion).
 * @returns remaining unabsorbed loss points (should be ≤ 0 when fleets are
 *          fully destroyed before absorbing all hits).
 */
const applyFleetLosses = (
  fleets: FleetInfo[],
  totalLosses: number,
  applyOddHitRule: boolean
): number => {
  let remaining = totalLosses;

  // Odd-hit rule: first hit must go to a levy or skyship
  if (applyOddHitRule && totalLosses % 2 === 1) {
    for (const fleet of fleets) {
      if (remaining <= 0) break;
      if (fleet.levies > 0) {
        fleet.levies -= 1;
        remaining -= 1;
        break;
      } else if (fleet.skyships > 0) {
        fleet.skyships -= 1;
        remaining -= 1;
        break;
      }
    }
  }

  // Main loss loop: levies → outnumbering skyships → regiments → elites
  fleets.forEach((fleet) => {
    while (remaining > 0 && fleetUnitCount(fleet) > 0) {
      if (fleet.skyships > fleet.regiments + fleet.levies + fleet.eliteRegiments && fleet.skyships > 0) {
        fleet.skyships -= 1;
        remaining -= 1;
      } else if (fleet.levies > 0) {
        fleet.levies -= 1;
        remaining -= 1;
      } else if (fleet.regiments > 0) {
        fleet.regiments -= 1;
        remaining -= 2;
      } else if (fleet.eliteRegiments > 0) {
        fleet.eliteRegiments -= 1;
        remaining -= 3;
      }
    }
    trimFleetCapacity(fleet);
  });

  return remaining;
};

/**
 * For each fleet at (x, y): counts surviving units and, if the fleet is
 * completely wiped out, resets its location to home [4,0] and removes the
 * owning player's entry from the battleMap tile.
 *
 * @returns total surviving unit count across all fleets at the tile.
 */
const cleanupWipedFleets = (
  fleets: FleetInfo[],
  x: number,
  y: number,
  playerID: string,
  battleMap: string[][][]
): number => {
  let remaining = 0;
  fleets.forEach((fleet) => {
    if (fleet.location[0] === x && fleet.location[1] === y) {
      const units = fleetUnitCount(fleet);
      remaining += units;
      if (units === 0) {
        fleet.location = [...KINGDOM_LOCATION];
        const tile = battleMap[y][x];
        const idx = tile.indexOf(playerID);
        if (idx !== -1) tile.splice(idx, 1);
      }
    }
  });
  return remaining;
};

function sanitizeFleetValue(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || isNaN(val)) {
    console.warn(`[forceRetrieveFleets] Invalid fleet value: ${val}, defaulting to ${fallback}`);
    return fallback;
  }
  return val;
}

/**
 * Force-retrieves all of a player's fleets at (x, y) back to home.
 * Returns troops to the player's resource pool and removes them from battleMap.
 * Used when a defeated/evading fleet has no valid retreat destination.
 */
export const forceRetrieveFleets = (
  G: MyGameState,
  playerID: string,
  x: number,
  y: number,
): void => {
  const player = G.playerInfo[playerID];
  if (!player) return;

  player.fleetInfo.forEach((fleet) => {
    if (fleet.location[0] === x && fleet.location[1] === y) {
      // Sanitize fleet values to prevent NaN in player resources
      const fleetSkyships = sanitizeFleetValue(fleet.skyships);
      const fleetRegiments = sanitizeFleetValue(fleet.regiments);
      const fleetLevies = sanitizeFleetValue(fleet.levies);
      const fleetElite = sanitizeFleetValue(fleet.eliteRegiments);

      player.resources.skyships += fleetSkyships;
      player.resources.regiments += fleetRegiments;
      player.resources.levies += fleetLevies;
      player.resources.eliteRegiments += fleetElite;
      fleet.skyships = 0;
      fleet.regiments = 0;
      fleet.levies = 0;
      fleet.eliteRegiments = 0;
      fleet.location = [...KINGDOM_LOCATION];
    }
  });

  const tile = G.mapState.battleMap[y]?.[x];
  if (tile) {
    const idx = tile.indexOf(playerID);
    if (idx !== -1) tile.splice(idx, 1);
  }

  logEvent(G, `${player.kingdomName}'s fleet forced to retreat home — no valid destination`);
};



export const resolveBattleAndReturnWinner = (
  G: MyGameState,
  events: EventsAPI,
  ctx: Ctx
) => {
  const [x, y] = G.mapState.currentBattle;

  const attackerID = G.battleState?.attacker.id ?? ctx.currentPlayer;
  const {
    swordValue: baseAttackerSword,
    shieldValue: baseAttackerShield,
    fleets: attackerFleets,
  } = calcFleetCombatValues(G.playerInfo[attackerID].fleetInfo, x, y);

  let attackerSwordValue = baseAttackerSword;
  let attackerShieldValue = baseAttackerShield;
  attackerSwordValue += G.battleState?.attacker.fowCard?.sword ?? 0;
  attackerShieldValue += G.battleState?.attacker.fowCard?.shield ?? 0;
  if (
    G.battleState?.attacker.fowCard &&
    G.playerInfo[G.battleState.attacker.id].resources.advantageCard === "improved_training"
  ) {
    if (G.battleState.attacker.fowCard.sword > 0) attackerSwordValue += 1;
    if (G.battleState.attacker.fowCard.shield > 0) attackerShieldValue += 1;
  }

  const defenderID = G.battleState?.defender.id ?? ctx.currentPlayer;
  const {
    swordValue: baseDefenderSword,
    shieldValue: baseDefenderShield,
    fleets: defenderFleets,
  } = calcFleetCombatValues(G.playerInfo[defenderID].fleetInfo, x, y);

  let defenderSwordValue = baseDefenderSword;
  let defenderShieldValue = baseDefenderShield;
  if (G.stage.sub === "ground_resolve") {
    const currentBuilding = G.mapState.buildings[y][x];
    defenderSwordValue += (currentBuilding.garrisonedRegiments ?? 0) * 2;
    defenderSwordValue += currentBuilding.garrisonedLevies ?? 0;
    defenderSwordValue += (currentBuilding.garrisonedEliteRegiments ?? 0) * 3;
    if (currentBuilding.fort.length > 0) {
      defenderShieldValue +=
        (currentBuilding.garrisonedRegiments ?? 0) +
        (currentBuilding.garrisonedLevies ?? 0) +
        (currentBuilding.garrisonedEliteRegiments ?? 0);
    }
  }
  defenderSwordValue += G.battleState?.defender.fowCard?.sword ?? 0;
  defenderShieldValue += G.battleState?.defender.fowCard?.shield ?? 0;
  if (
    G.battleState?.defender.fowCard &&
    G.playerInfo[G.battleState.defender.id].resources.advantageCard === "improved_training"
  ) {
    if (G.battleState.defender.fowCard.sword > 0) defenderSwordValue += 1;
    if (G.battleState.defender.fowCard.shield > 0) defenderShieldValue += 1;
  }

  const attackerName = G.playerInfo[attackerID].kingdomName;
  const defenderName = G.playerInfo[defenderID].kingdomName;
  const battleType = G.stage.sub === "ground_resolve" ? "Ground battle" : "Aerial battle";
  logEvent(G, `${battleType}: ${attackerName} (${attackerSwordValue}S/${attackerShieldValue}Sh) vs ${defenderName} (${defenderSwordValue}S/${defenderShieldValue}Sh)`);

  const { hitsOnAttacker: attackerLosses, hitsOnDefender: defenderLosses } = calculateCombat(
    { swords: attackerSwordValue, shields: attackerShieldValue, fowSword: 0, fowShield: 0 },
    { swords: defenderSwordValue, shields: defenderShieldValue, fowSword: 0, fowShield: 0 },
  );

  const attackerSnap = snapshotFleets(attackerFleets);
  const defenderFleetSnap = snapshotFleets(defenderFleets);
  const garrisonSnapLevies = G.stage.sub === "ground_resolve" ? (G.mapState.buildings[y][x].garrisonedLevies ?? 0) : 0;
  const garrisonSnapRegiments = G.stage.sub === "ground_resolve" ? (G.mapState.buildings[y][x].garrisonedRegiments ?? 0) : 0;
  const garrisonSnapElite = G.stage.sub === "ground_resolve" ? (G.mapState.buildings[y][x].garrisonedEliteRegiments ?? 0) : 0;

  applyFleetLosses(attackerFleets, attackerLosses, true);

  if (G.stage.sub === "ground_resolve") {
    const currentBuilding = G.mapState.buildings[y][x];
    let defenderLossesCopy = defenderLosses;
    if (defenderLosses % 2 === 1 && (currentBuilding.garrisonedLevies ?? 0) > 0) {
      currentBuilding.garrisonedLevies! -= 1;
      defenderLossesCopy -= 1;
    }
    while (
      defenderLossesCopy > 0 &&
      (currentBuilding.garrisonedRegiments > 0 ||
        currentBuilding.garrisonedLevies > 0 ||
        (currentBuilding.garrisonedEliteRegiments ?? 0) > 0)
    ) {
      if (currentBuilding.garrisonedLevies > 0) {
        currentBuilding.garrisonedLevies -= 1;
        defenderLossesCopy -= 1;
      } else if (currentBuilding.garrisonedRegiments > 0) {
        currentBuilding.garrisonedRegiments -= 1;
        defenderLossesCopy -= 2;
      } else if ((currentBuilding.garrisonedEliteRegiments ?? 0) > 0) {
        currentBuilding.garrisonedEliteRegiments -= 1;
        defenderLossesCopy -= 3;
      }
    }
  } else {
    applyFleetLosses(defenderFleets, defenderLosses, true);
  }

  let attackerLossDetail: string;
  let defenderLossDetail: string;
  {
    const attackerAfter = snapshotFleets(attackerFleets);
    attackerLossDetail = formatLosses({
      levies: attackerSnap.levies - attackerAfter.levies,
      regiments: attackerSnap.regiments - attackerAfter.regiments,
      eliteRegiments: attackerSnap.eliteRegiments - attackerAfter.eliteRegiments,
      skyships: attackerSnap.skyships - attackerAfter.skyships,
    });

    if (G.stage.sub === "ground_resolve") {
      const currentBuilding = G.mapState.buildings[y][x];
      const defenderAfter = snapshotFleets(defenderFleets);
      defenderLossDetail = formatLosses({
        levies: (garrisonSnapLevies - (currentBuilding.garrisonedLevies ?? 0)) + (defenderFleetSnap.levies - defenderAfter.levies),
        regiments: (garrisonSnapRegiments - (currentBuilding.garrisonedRegiments ?? 0)) + (defenderFleetSnap.regiments - defenderAfter.regiments),
        eliteRegiments: (garrisonSnapElite - (currentBuilding.garrisonedEliteRegiments ?? 0)) + (defenderFleetSnap.eliteRegiments - defenderAfter.eliteRegiments),
        skyships: defenderFleetSnap.skyships - defenderAfter.skyships,
      });
    } else {
      const defenderAfter = snapshotFleets(defenderFleets);
      defenderLossDetail = formatLosses({
        levies: defenderFleetSnap.levies - defenderAfter.levies,
        regiments: defenderFleetSnap.regiments - defenderAfter.regiments,
        eliteRegiments: defenderFleetSnap.eliteRegiments - defenderAfter.eliteRegiments,
        skyships: defenderFleetSnap.skyships - defenderAfter.skyships,
      });
    }

    logEvent(G, `Losses — ${attackerName}: ${attackerLossDetail} | ${defenderName}: ${defenderLossDetail}`);
  }

  let winner =
    attackerLosses >= defenderLosses
      ? G.battleState?.defender.id
      : G.battleState?.attacker.id;

  const remainingAttackers = cleanupWipedFleets(
    attackerFleets,
    x,
    y,
    attackerID,
    G.mapState.battleMap
  );

  let remainingDefenders = 0;
  if (G.stage.sub === "ground_resolve") {
    const currentBuilding = G.mapState.buildings[y][x];
    remainingDefenders +=
      (currentBuilding.garrisonedLevies ?? 0) +
      (currentBuilding.garrisonedRegiments ?? 0) +
      (currentBuilding.garrisonedEliteRegiments ?? 0);
  } else {
    remainingDefenders = cleanupWipedFleets(
      defenderFleets,
      x,
      y,
      defenderID,
      G.mapState.battleMap
    );
  }

  if (remainingAttackers === 0 && remainingDefenders > 0) {
    winner = G.battleState?.defender.id;
  } else if (remainingDefenders === 0 && remainingAttackers > 0) {
    winner = G.battleState?.attacker.id;
  } else if (remainingAttackers === 0 && remainingDefenders === 0) {
    winner = "total annihilation";
  }
  if (remainingDefenders > 0 && G.stage.sub === "ground_resolve") {
    winner = G.battleState?.defender.id;
  }
  if (winner !== "total annihilation" && winner) {
    const winnerName = G.playerInfo[winner]?.kingdomName ?? "Unknown";
    logEvent(G, `${battleType} won by ${winnerName} (+1 VP)`);
    G.battleState &&
      Object.values(G.battleState).forEach((player) => {
        if (player.id === winner) {
          const loserId = Object.values(G.battleState!).find(p => p.id !== winner)?.id;
          const loserAlignment = loserId ? G.playerInfo[loserId].hereticOrOrthodox : undefined;
          if (loserAlignment && loserAlignment !== player.hereticOrOrthodox) {
            if (player.hereticOrOrthodox === "heretic") {
              increaseHeresyWithinMove(G, player.id);
            } else {
              increaseOrthodoxyWithinMove(G, player.id);
            }
          }
          player.victorious = true;
          player.resources.victoryPoints += 1;
        } else {
          player.victorious = false;
        }
      });
    G.battleResult = {
      battleType,
      attackerName,
      defenderName,
      attackerSwords: attackerSwordValue,
      attackerShields: attackerShieldValue,
      defenderSwords: defenderSwordValue,
      defenderShields: defenderShieldValue,
      attackerFoW: G.battleState?.attacker.fowCard ?? null,
      defenderFoW: G.battleState?.defender.fowCard ?? null,
      attackerLosses: attackerLossDetail,
      defenderLosses: defenderLossDetail,
      winner: winnerName,
      outcome: `${winnerName} wins (+1 VP)`,
    };

    if (remainingAttackers === 0 || remainingDefenders === 0) {
      if (
        G.stage.sub === "ground_resolve" &&
        remainingDefenders === 0 &&
        remainingAttackers > 0
      ) {
        setStage(G, "resolution", "ground_garrison");
        computeGarrisonTroops(G, winner);
        events.endTurn({ next: winner });
      } else {
        nextAfterAerialDecision(G, ctx, events, G.battleState?.attacker.id ?? ctx.currentPlayer);
      }
    } else {
      if (G.stage.sub === "ground_resolve") {
        nextAfterGroundDecision(G, ctx, events, G.battleState?.attacker.id ?? ctx.currentPlayer);
      } else {
        // Pre-compute valid relocation tiles for the frontend
        try {
          const possibleTiles = findPossibleDestinations(G, G.mapState.currentBattle, true);
          const emptyTiles: number[][] = [];
          for (let i = 1; i < possibleTiles.length; i++) {
            possibleTiles[i].forEach((tile) => {
              if (emptyTiles.length === 0 || i === 1) {
                if (G.mapState.battleMap[tile[1]]?.[tile[0]]?.length === 0) {
                  emptyTiles.push(tile);
                }
              }
            });
          }
          G.validRelocationTiles = emptyTiles;
        } catch {
          G.validRelocationTiles = [];
        }
        if (G.validRelocationTiles.length === 0) {
          // No valid relocation destinations — skip relocate stage, advance battle
          nextAfterAerialDecision(G, ctx, events, winner);
        } else {
          setStage(G, "resolution", "relocate_loser");
          events.endTurn({ next: winner });
        }
      }
    }
  } else {
    // Total annihilation or draw
    G.battleResult = {
      battleType,
      attackerName,
      defenderName,
      attackerSwords: attackerSwordValue,
      attackerShields: attackerShieldValue,
      defenderSwords: defenderSwordValue,
      defenderShields: defenderShieldValue,
      attackerFoW: G.battleState?.attacker.fowCard ?? null,
      defenderFoW: G.battleState?.defender.fowCard ?? null,
      attackerLosses: attackerLossDetail,
      defenderLosses: defenderLossDetail,
      winner: winner === "total annihilation" ? "Total annihilation" : "Draw",
      outcome: winner === "total annihilation" ? "Both sides destroyed" : "Stalemate",
    };
    if (G.stage.sub === "ground_resolve") {
      const currentBuilding = G.mapState.buildings[y][x];
      currentBuilding.player = undefined;
      nextAfterGroundDecision(G, ctx, events, G.battleState?.attacker.id ?? ctx.currentPlayer);
    } else {
      nextAfterAerialDecision(G, ctx, events, G.battleState?.attacker.id ?? ctx.currentPlayer);
    }
  }
};

export const resolveConquest = (
  G: MyGameState,
  events: EventsAPI,
  ctx: Ctx,
  random: RandomAPI
) => {
  const [x, y] = G.mapState.currentBattle;

  const attackerID = G.battleState?.attacker.id ?? ctx.currentPlayer;
  const {
    swordValue: baseAttackerSword,
    shieldValue: baseAttackerShield,
    fleets: attackerFleets,
  } = calcFleetCombatValues(G.playerInfo[attackerID].fleetInfo, x, y);

  let attackerSwordValue = baseAttackerSword;
  let attackerShieldValue = baseAttackerShield;

  let attackerGarrisonedRegiments = G.mapState.buildings[y][x].garrisonedRegiments;
  let attackerGarrisonedLevies = G.mapState.buildings[y][x].garrisonedLevies;
  let attackerGarrisonedEliteRegiments = G.mapState.buildings[y][x].garrisonedEliteRegiments ?? 0;

  attackerSwordValue += attackerGarrisonedRegiments * 2;
  attackerSwordValue += attackerGarrisonedLevies;
  attackerSwordValue += attackerGarrisonedEliteRegiments * 3;

  attackerSwordValue += G.conquestState?.fowCard?.sword ?? 0;
  attackerShieldValue += G.conquestState?.fowCard?.shield ?? 0;

  const defenderCard = drawFortuneOfWarCard(G, random.Shuffle);

  const defenderSwordValue =
    G.mapState.currentTileArray[y][x].sword + defenderCard.sword;
  const defenderShieldValue =
    G.mapState.currentTileArray[y][x].shield + defenderCard.shield;

  const conquestPlayerName = G.playerInfo[attackerID].kingdomName;
  const landName = G.mapState.currentTileArray[y][x]?.name ?? "unknown land";
  logEvent(G, `Conquest: ${conquestPlayerName} attacks ${landName} (${attackerSwordValue}S vs ${defenderSwordValue}S/${defenderShieldValue}Sh)`);

  const { hitsOnAttacker: attackerLosses, hitsOnDefender: attackerHits } = calculateCombat(
    { swords: attackerSwordValue, shields: attackerShieldValue, fowSword: 0, fowShield: 0 },
    { swords: defenderSwordValue, shields: defenderShieldValue, fowSword: 0, fowShield: 0 },
  );
  let attackerLossesCopy = attackerLosses;

  const conquestGarrisonSnapLevies = attackerGarrisonedLevies;
  const conquestGarrisonSnapRegiments = attackerGarrisonedRegiments;
  const conquestGarrisonSnapElite = attackerGarrisonedEliteRegiments;
  const conquestFleetSnap = snapshotFleets(attackerFleets);

  if (attackerLossesCopy > attackerGarrisonedLevies) {
    attackerLossesCopy -= attackerGarrisonedLevies;
    attackerGarrisonedLevies = 0;
  } else {
    attackerGarrisonedLevies -= attackerLossesCopy;
    attackerLossesCopy = 0;
  }
  if (attackerLossesCopy > attackerGarrisonedRegiments * 2) {
    attackerLossesCopy -= attackerGarrisonedRegiments * 2;
    attackerGarrisonedRegiments = 0;
  } else {
    attackerGarrisonedRegiments -= Math.ceil(attackerLossesCopy / 2);
    attackerLossesCopy = 0;
  }
  if (attackerLossesCopy > attackerGarrisonedEliteRegiments * 3) {
    attackerLossesCopy -= attackerGarrisonedEliteRegiments * 3;
    attackerGarrisonedEliteRegiments = 0;
  } else {
    attackerGarrisonedEliteRegiments -= Math.ceil(attackerLossesCopy / 3);
    attackerLossesCopy = 0;
  }

  applyFleetLosses(attackerFleets, attackerLossesCopy, false);

  const conquestFleetAfter = snapshotFleets(attackerFleets);
  const conquestLossDetail = formatLosses({
    levies: (conquestGarrisonSnapLevies - attackerGarrisonedLevies) + (conquestFleetSnap.levies - conquestFleetAfter.levies),
    regiments: (conquestGarrisonSnapRegiments - attackerGarrisonedRegiments) + (conquestFleetSnap.regiments - conquestFleetAfter.regiments),
    eliteRegiments: (conquestGarrisonSnapElite - attackerGarrisonedEliteRegiments) + (conquestFleetSnap.eliteRegiments - conquestFleetAfter.eliteRegiments),
    skyships: conquestFleetSnap.skyships - conquestFleetAfter.skyships,
  });
  logEvent(G, `Conquest losses — ${conquestPlayerName}: ${conquestLossDetail}`);

  // Count survivors (garrison + fleets) and clean up wiped fleets
  let remainingAttackers =
    attackerGarrisonedLevies + attackerGarrisonedRegiments + attackerGarrisonedEliteRegiments;
  remainingAttackers += cleanupWipedFleets(
    attackerFleets,
    x,
    y,
    attackerID,
    G.mapState.battleMap
  );

  const tileStrength = G.mapState.currentTileArray[y][x].sword;

  const conquestResultBase = {
    battleType: "Conquest",
    attackerName: conquestPlayerName,
    defenderName: landName,
    attackerSwords: attackerSwordValue,
    attackerShields: attackerShieldValue,
    defenderSwords: defenderSwordValue,
    defenderShields: defenderShieldValue,
    attackerFoW: G.conquestState?.fowCard ?? null,
    defenderFoW: defenderCard,
    attackerLosses: conquestLossDetail,
    defenderLosses: "—",
  };

  if (attackerHits < tileStrength || remainingAttackers < 1) {
    logEvent(G, `Conquest failed: ${conquestPlayerName} loses outpost at ${landName}`);
    G.battleResult = { ...conquestResultBase, winner: landName, outcome: "Conquest failed — outpost lost" };
    const currentBuilding = G.mapState.buildings[y][x];
    if (currentBuilding.garrisonedRegiments > 0) {
      attackerFleets.forEach((fleet) => {
        const difference = fleet.skyships - (fleet.levies + fleet.regiments);
        if (difference > 0) {
          const lowerAmount = Math.min(
            difference,
            currentBuilding.garrisonedRegiments
          );
          fleet.regiments += lowerAmount;
          currentBuilding.garrisonedRegiments -= lowerAmount;
        }
      });
    }
    if (currentBuilding.garrisonedLevies > 0) {
      attackerFleets.forEach((fleet) => {
        const difference = fleet.skyships - (fleet.levies + fleet.regiments);
        if (difference > 0) {
          const lowerAmount = Math.min(
            difference,
            currentBuilding.garrisonedLevies
          );
          fleet.regiments += lowerAmount;
          currentBuilding.garrisonedLevies -= lowerAmount;
        }
      });
    }

    currentBuilding.player = undefined;
    currentBuilding.fort = [];
    currentBuilding.garrisonedLevies = 0;
    currentBuilding.garrisonedRegiments = 0;
    currentBuilding.garrisonedEliteRegiments = 0;
    G.failedConquests.push({
      playerId: attackerID,
      tile: [x, y],
    });
    G.conquestState = undefined;
    nextAfterConquest(G, events);
  } else if (attackerHits >= tileStrength && remainingAttackers > 0) {
    logEvent(G, `Conquest succeeded: ${conquestPlayerName} colonises ${landName} (+1 VP)`);
    G.battleResult = { ...conquestResultBase, winner: conquestPlayerName, outcome: `${conquestPlayerName} colonises ${landName} (+1 VP)` };
    const currentPlayer = G.playerInfo[attackerID];
    const currentBuilding = G.mapState.buildings[y][x];
    const currentTile = G.mapState.currentTileArray[y][x];

    currentPlayer.resources.victoryPoints += 1;
    increaseHeresyWithinMove(G, currentPlayer.id);

    GOODS.forEach((good) => {
      const qty = currentTile.loot.colony[good];
      if (qty > 0) {
        G.mapState.goodsPriceMarkers[good] = Math.max(PRICE_MARKER_MIN, G.mapState.goodsPriceMarkers[good] - qty);
      }
    });

    currentBuilding.player = currentPlayer;
    currentBuilding.buildings = "colony";
    G.conquestState = undefined;
    setStage(G, "resolution", "conquest_garrison");
    computeGarrisonTroops(G, attackerID);
  }
};
