import { Ctx } from "boardgame.io";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { FleetInfo, GoodKey, MyGameState } from "../types";
import {
  findNextConquest,
  findNextGroundBattle,
  findNextPlayerInBattleSequence,
} from "./findNext";
import { drawFortuneOfWarCard } from "./helpers";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { increaseHeresyWithinMove, increaseOrthodoxyWithinMove, logEvent } from "./stateUtils";
import { PRICE_MARKER_MIN } from "../codifiedGameInfo";

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

// ---------------------------------------------------------------------------
// Private battle math helpers
// ---------------------------------------------------------------------------

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
    // GAP-23 / GAP-14: troops aboard destroyed Skyships are lost — trim to capacity
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
        fleet.location = [4, 0];
        const tile = battleMap[y][x];
        const idx = tile.indexOf(playerID);
        if (idx !== -1) tile.splice(idx, 1);
      }
    }
  });
  return remaining;
};

// ---------------------------------------------------------------------------
// Exported battle resolution functions
// ---------------------------------------------------------------------------

export const resolveBattleAndReturnWinner = (
  G: MyGameState,
  events: EventsAPI,
  ctx: Ctx
) => {
  const [x, y] = G.mapState.currentBattle;

  // --- Attacker fleet combat values ---
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
  // GAP-8: improved_training KA — +1 sword/shield per FoW card played, matching the card's stats
  if (
    G.battleState?.attacker.fowCard &&
    G.playerInfo[G.battleState.attacker.id].resources.advantageCard === "improved_training"
  ) {
    if (G.battleState.attacker.fowCard.sword > 0) attackerSwordValue += 1;
    if (G.battleState.attacker.fowCard.shield > 0) attackerShieldValue += 1;
  }

  // --- Defender fleet combat values ---
  const defenderID = G.battleState?.defender.id ?? ctx.currentPlayer;
  const {
    swordValue: baseDefenderSword,
    shieldValue: baseDefenderShield,
    fleets: defenderFleets,
  } = calcFleetCombatValues(G.playerInfo[defenderID].fleetInfo, x, y);

  let defenderSwordValue = baseDefenderSword;
  let defenderShieldValue = baseDefenderShield;
  if (ctx.phase === "ground_battle") {
    const currentBuilding = G.mapState.buildings[y][x];
    defenderSwordValue += (currentBuilding.garrisonedRegiments ?? 0) * 2;
    defenderSwordValue += currentBuilding.garrisonedLevies ?? 0;
    defenderSwordValue += (currentBuilding.garrisonedEliteRegiments ?? 0) * 3;
    if (currentBuilding.fort) {
      defenderShieldValue +=
        (currentBuilding.garrisonedRegiments ?? 0) +
        (currentBuilding.garrisonedLevies ?? 0) +
        (currentBuilding.garrisonedEliteRegiments ?? 0);
    }
  }
  defenderSwordValue += G.battleState?.defender.fowCard?.sword ?? 0;
  defenderShieldValue += G.battleState?.defender.fowCard?.shield ?? 0;
  // GAP-8: improved_training KA for defender
  if (
    G.battleState?.defender.fowCard &&
    G.playerInfo[G.battleState.defender.id].resources.advantageCard === "improved_training"
  ) {
    if (G.battleState.defender.fowCard.sword > 0) defenderSwordValue += 1;
    if (G.battleState.defender.fowCard.shield > 0) defenderShieldValue += 1;
  }

  const attackerName = G.playerInfo[attackerID].kingdomName;
  const defenderName = G.playerInfo[defenderID].kingdomName;
  const battleType = ctx.phase === "ground_battle" ? "Ground battle" : "Aerial battle";
  logEvent(G, `${battleType}: ${attackerName} (${attackerSwordValue}S/${attackerShieldValue}Sh) vs ${defenderName} (${defenderSwordValue}S/${defenderShieldValue}Sh)`);

  const attackerLosses = defenderSwordValue - attackerShieldValue;
  const defenderLosses = attackerSwordValue - defenderShieldValue;

  // --- Apply losses ---
  // GAP-22: odd-hit rule applies to aerial/ground fleet combats
  applyFleetLosses(attackerFleets, attackerLosses, true);

  if (ctx.phase === "ground_battle") {
    const currentBuilding = G.mapState.buildings[y][x];
    let defenderLossesCopy = defenderLosses;
    // GAP-22: odd hit rule for garrison defender — at least 1 Levy must absorb if hits are odd
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

  // --- Determine winner ---
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
  if (ctx.phase === "ground_battle") {
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
  if (remainingDefenders > 0 && ctx.phase === "ground_battle") {
    winner = G.battleState?.defender.id;
  }
  if (winner !== "total annihilation" && winner) {
    const winnerName = G.playerInfo[winner]?.kingdomName ?? "Unknown";
    logEvent(G, `${battleType} won by ${winnerName} (+1 VP)`);
    G.battleState &&
      Object.values(G.battleState).forEach((player) => {
        if (player.id === winner) {
          // DEV-8: heresy shift applies to both aerial and ground battles,
          // but only when the two sides have opposing alignments
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
    if (remainingAttackers === 0 || remainingDefenders === 0) {
      if (
        ctx.phase === "ground_battle" &&
        remainingDefenders === 0 &&
        remainingAttackers > 0
      ) {
        G.stage = "garrison troops";
        events.endTurn({ next: winner });
      } else {
        findNextPlayerInBattleSequence(
          G.battleState?.attacker.id ?? ctx.currentPlayer,
          ctx,
          G,
          events
        );
      }
    } else {
      if (ctx.phase === "ground_battle") {
        findNextGroundBattle(G, events);
      } else {
        G.stage = "relocate loser";
        events.endTurn({ next: winner });
      }
    }
  } else {
    if (ctx.phase === "ground_battle") {
      const currentBuilding = G.mapState.buildings[y][x];
      currentBuilding.player = undefined;
      findNextGroundBattle(G, events);
    } else {
      findNextPlayerInBattleSequence(
        G.battleState?.attacker.id ?? ctx.currentPlayer,
        ctx,
        G,
        events
      );
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

  // --- Attacker fleet combat values ---
  const attackerID = G.battleState?.attacker.id ?? ctx.currentPlayer;
  const {
    swordValue: baseAttackerSword,
    shieldValue: baseAttackerShield,
    fleets: attackerFleets,
  } = calcFleetCombatValues(G.playerInfo[attackerID].fleetInfo, x, y);

  let attackerSwordValue = baseAttackerSword;
  let attackerShieldValue = baseAttackerShield;

  // Garrison troops contribute swords (but not shields — no fort during conquest attempt)
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

  const attackerLosses = defenderSwordValue - attackerShieldValue;
  let attackerLossesCopy = attackerLosses.valueOf();

  // Garrison troops absorb losses first (conquest-specific priority — no odd-hit rule here)
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

  // Fleet troops absorb any remaining losses (no odd-hit rule — garrison absorbed first)
  applyFleetLosses(attackerFleets, attackerLossesCopy, false);

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

  const attackerHits = Math.max(0, attackerSwordValue - defenderShieldValue);
  const tileStrength = G.mapState.currentTileArray[y][x].sword;

  if (attackerHits < tileStrength || remainingAttackers < 1) {
    logEvent(G, `Conquest failed: ${conquestPlayerName} loses outpost at ${landName}`);
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
    currentBuilding.fort = false;
    currentBuilding.garrisonedLevies = 0;
    currentBuilding.garrisonedRegiments = 0;
    currentBuilding.garrisonedEliteRegiments = 0;
    // GAP-15 sub-rule 3: record that this player failed conquest here this round
    G.failedConquests.push({
      playerId: attackerID,
      tile: [x, y],
    });
    G.conquestState = undefined;
    findNextConquest(G, events);
  } else if (attackerHits >= tileStrength && remainingAttackers > 0) {
    logEvent(G, `Conquest succeeded: ${conquestPlayerName} colonises ${landName} (+1 VP)`);
    const currentPlayer = G.playerInfo[attackerID];
    const currentBuilding = G.mapState.buildings[y][x];
    const currentTile = G.mapState.currentTileArray[y][x];

    // GAP-RES1: goods are no longer granted immediately on conquest —
    // they are recalculated each round via grantTradeRouteGoods in resolveRound.
    currentPlayer.resources.victoryPoints += 1;
    increaseHeresyWithinMove(G, currentPlayer.id);

    // GAP-15 sub-rule 2: move price markers left for each additional colony good
    // (the broken-line rectangle goods on the tile, per "Resolve Conquest Attempt" rule)
    GOODS.forEach((good) => {
      const qty = currentTile.loot.colony[good];
      if (qty > 0) {
        G.mapState.goodsPriceMarkers[good] = Math.max(PRICE_MARKER_MIN, G.mapState.goodsPriceMarkers[good] - qty);
      }
    });

    currentBuilding.player = currentPlayer;
    currentBuilding.buildings = "colony";
    G.conquestState = undefined;
    G.stage = "garrison troops";
  }
};
