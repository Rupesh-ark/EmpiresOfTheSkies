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

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

export const resolveBattleAndReturnWinner = (
  G: MyGameState,
  events: EventsAPI,
  ctx: Ctx
) => {
  const [x, y] = G.mapState.currentBattle;

  let attackerSwordValue = 0;
  let attackerShieldValue = 0;
  let attackerFleets: FleetInfo[] = [];
  G.playerInfo[
    G.battleState?.attacker.id ?? ctx.currentPlayer
  ].fleetInfo.forEach((currentFleet) => {
    if (currentFleet.location[0] === x && currentFleet.location[1] === y) {
      attackerSwordValue +=
        currentFleet.skyships +
        currentFleet.levies +
        currentFleet.regiments * 2;
      attackerShieldValue += currentFleet.skyships;
      attackerFleets.push(currentFleet);
    }
  });
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

  let defenderSwordValue = 0;
  let defenderShieldValue = 0;
  let defenderFleets: FleetInfo[] = [];
  G.playerInfo[
    G.battleState?.defender.id ?? ctx.currentPlayer
  ].fleetInfo.forEach((currentFleet) => {
    if (currentFleet.location[0] === x && currentFleet.location[1] === y) {
      defenderSwordValue +=
        currentFleet.skyships +
        currentFleet.levies +
        currentFleet.regiments * 2;
      defenderShieldValue += currentFleet.skyships;
      defenderFleets.push(currentFleet);
    }
  });
  if (ctx.phase === "ground_battle") {
    const currentBuilding = G.mapState.buildings[y][x];
    defenderSwordValue += (currentBuilding.garrisonedRegiments ?? 0) * 2;
    defenderSwordValue += currentBuilding.garrisonedLevies ?? 0;
    if (currentBuilding.fort) {
      defenderShieldValue +=
        (currentBuilding.garrisonedRegiments ?? 0) +
        (currentBuilding.garrisonedLevies ?? 0);
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

  const attackerName = G.playerInfo[G.battleState?.attacker.id ?? ctx.currentPlayer].kingdomName;
  const defenderName = G.playerInfo[G.battleState?.defender.id ?? ctx.currentPlayer].kingdomName;
  const battleType = ctx.phase === "ground_battle" ? "Ground battle" : "Aerial battle";
  logEvent(G, `${battleType}: ${attackerName} (${attackerSwordValue}S/${attackerShieldValue}Sh) vs ${defenderName} (${defenderSwordValue}S/${defenderShieldValue}Sh)`);

  const attackerLosses = defenderSwordValue - attackerShieldValue;
  let attackerLossesCopy = attackerLosses.valueOf();

  const defenderLosses = attackerSwordValue - defenderShieldValue;
  let defenderLossesCopy = defenderLosses.valueOf();

  // GAP-22: odd hit rule — if total attacker hits are odd, at least 1 Skyship or Levy must absorb a hit
  let attackerOddHitSatisfied = attackerLosses % 2 !== 1;
  attackerFleets.forEach((fleet) => {
    if (!attackerOddHitSatisfied && attackerLossesCopy > 0) {
      if (fleet.levies > 0) {
        fleet.levies -= 1;
        attackerLossesCopy -= 1;
        attackerOddHitSatisfied = true;
      } else if (fleet.skyships > 0) {
        fleet.skyships -= 1;
        attackerLossesCopy -= 1;
        attackerOddHitSatisfied = true;
      }
    }
    while (
      attackerLossesCopy > 0 &&
      (fleet.regiments > 0 || fleet.skyships > 0 || fleet.levies > 0)
    ) {
      if (
        fleet.skyships > fleet.regiments + fleet.levies &&
        fleet.skyships > 0
      ) {
        fleet.skyships -= 1;
        attackerLossesCopy -= 1;
      } else if (fleet.levies > 0) {
        fleet.levies -= 1;
        attackerLossesCopy -= 1;
      } else if (fleet.regiments > 0) {
        fleet.regiments -= 1;
        attackerLossesCopy -= 2;
      }
    }
    // GAP-23 / GAP-14: troops aboard destroyed Skyships are lost — trim to Skyship capacity
    while (fleet.regiments + fleet.levies > fleet.skyships) {
      if (fleet.levies > 0) {
        fleet.levies -= 1;
      } else if (fleet.regiments > 0) {
        fleet.regiments -= 1;
      } else {
        break;
      }
    }
  });
  if (ctx.phase === "ground_battle") {
    const currentBuilding = G.mapState.buildings[y][x];
    // GAP-22: odd hit rule for garrison defender — at least 1 Levy must absorb if hits are odd
    if (defenderLosses % 2 === 1 && (currentBuilding.garrisonedLevies ?? 0) > 0) {
      currentBuilding.garrisonedLevies! -= 1;
      defenderLossesCopy -= 1;
    }
    while (
      defenderLossesCopy > 0 &&
      (currentBuilding.garrisonedRegiments > 0 ||
        currentBuilding.garrisonedLevies > 0)
    ) {
      if (currentBuilding.garrisonedLevies > 0) {
        currentBuilding.garrisonedLevies -= 1;
        defenderLossesCopy -= 1;
      } else if (currentBuilding.garrisonedRegiments > 0) {
        currentBuilding.garrisonedRegiments -= 1;
        defenderLossesCopy -= 2;
      }
    }
  } else {
    // GAP-22: odd hit rule — if total defender hits are odd, at least 1 Skyship or Levy must absorb a hit
    let defenderOddHitSatisfied = defenderLosses % 2 !== 1;
    defenderFleets.forEach((fleet) => {
      if (!defenderOddHitSatisfied && defenderLossesCopy > 0) {
        if (fleet.levies > 0) {
          fleet.levies -= 1;
          defenderLossesCopy -= 1;
          defenderOddHitSatisfied = true;
        } else if (fleet.skyships > 0) {
          fleet.skyships -= 1;
          defenderLossesCopy -= 1;
          defenderOddHitSatisfied = true;
        }
      }
      while (
        defenderLossesCopy > 0 &&
        (fleet.regiments > 0 || fleet.skyships > 0 || fleet.levies > 0)
      ) {
        if (
          fleet.skyships > fleet.regiments + fleet.levies &&
          fleet.skyships > 0
        ) {
          fleet.skyships -= 1;
          defenderLossesCopy -= 1;
        } else if (fleet.levies > 0) {
          fleet.levies -= 1;
          defenderLossesCopy -= 1;
        } else if (fleet.regiments > 0) {
          fleet.regiments -= 1;
          defenderLossesCopy -= 2;
        }
      }
      // GAP-23: troops aboard destroyed Skyships are lost — trim to Skyship capacity
      while (fleet.regiments + fleet.levies > fleet.skyships) {
        if (fleet.levies > 0) {
          fleet.levies -= 1;
        } else if (fleet.regiments > 0) {
          fleet.regiments -= 1;
        } else {
          break;
        }
      }
    });
  }

  let winner =
    attackerLosses >= defenderLosses
      ? G.battleState?.defender.id
      : G.battleState?.attacker.id;

  let remainingAttackers = 0;
  let remainingDefenders = 0;

  attackerFleets.forEach((fleet) => {
    if (fleet.location[0] === x && fleet.location[1] === y) {
      remainingAttackers += fleet.regiments + fleet.levies + fleet.skyships;
      if (fleet.regiments + fleet.levies + fleet.skyships === 0) {
        fleet.location = [4, 0];
        G.mapState.battleMap[y][x].splice(
          G.mapState.battleMap[y][x].indexOf(
            G.battleState?.attacker.id ?? ctx.currentPlayer
          ),
          1
        );
      }
    }
  });
  if (ctx.phase === "ground_battle") {
    const currentBuilding = G.mapState.buildings[y][x];
    remainingDefenders +=
      (currentBuilding.garrisonedLevies ?? 0) +
      (currentBuilding.garrisonedRegiments ?? 0);
  } else {
    defenderFleets.forEach((fleet) => {
      if (fleet.location[0] === x && fleet.location[1] === y) {
        remainingDefenders += fleet.regiments + fleet.levies + fleet.skyships;
        if (fleet.regiments + fleet.levies + fleet.skyships === 0) {
          fleet.location = [4, 0];
          G.mapState.battleMap[y][x].splice(
            G.mapState.battleMap[y][x].indexOf(
              G.battleState?.defender.id ?? ctx.currentPlayer
            ),
            1
          );
        }
      }
    });
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

  let attackerSwordValue = 0;
  let attackerShieldValue = 0;
  let attackerFleets: FleetInfo[] = [];

  G.playerInfo[
    G.battleState?.attacker.id ?? ctx.currentPlayer
  ].fleetInfo.forEach((currentFleet) => {
    if (currentFleet.location[0] === x && currentFleet.location[1] === y) {
      attackerSwordValue +=
        currentFleet.skyships +
        currentFleet.levies +
        currentFleet.regiments * 2;
      attackerShieldValue += currentFleet.skyships;
      attackerFleets.push(currentFleet);
    }
  });
  let attackerGarrisonedRegiments =
    G.mapState.buildings[y][x].garrisonedRegiments;

  let attackerGarrisonedLevies = G.mapState.buildings[y][x].garrisonedLevies;

  attackerSwordValue += attackerGarrisonedRegiments * 2;

  attackerSwordValue += attackerGarrisonedLevies;

  attackerSwordValue += G.conquestState?.fowCard?.sword ?? 0;
  attackerShieldValue += G.conquestState?.fowCard?.shield ?? 0;

  const defenderCard = drawFortuneOfWarCard(G);

  const defenderSwordValue =
    G.mapState.currentTileArray[y][x].sword + defenderCard.sword;
  const defenderShieldValue =
    G.mapState.currentTileArray[y][x].shield + defenderCard.shield;

  const conquestPlayerName = G.playerInfo[G.battleState?.attacker.id ?? ctx.currentPlayer].kingdomName;
  const landName = G.mapState.currentTileArray[y][x]?.name ?? "unknown land";
  logEvent(G, `Conquest: ${conquestPlayerName} attacks ${landName} (${attackerSwordValue}S vs ${defenderSwordValue}S/${defenderShieldValue}Sh)`);

  const attackerLosses = defenderSwordValue - attackerShieldValue;
  let attackerLossesCopy = attackerLosses.valueOf();

  if (attackerLossesCopy > attackerGarrisonedLevies) {
    attackerLossesCopy -= attackerGarrisonedLevies;
    attackerGarrisonedLevies = 0;
  } else {
    attackerGarrisonedLevies -= attackerLossesCopy;

    attackerLossesCopy = 0;
  }
  if (attackerLossesCopy > attackerGarrisonedRegiments) {
    attackerLossesCopy -= attackerGarrisonedRegiments;
    attackerGarrisonedRegiments = 0;
  } else {
    attackerGarrisonedRegiments -= attackerLossesCopy;

    attackerLossesCopy = 0;
  }
  attackerFleets.forEach((fleet) => {
    while (
      attackerLossesCopy > 0 &&
      (fleet.regiments > 0 || fleet.skyships > 0 || fleet.levies > 0)
    ) {
      if (
        fleet.skyships > fleet.regiments + fleet.levies &&
        fleet.skyships > 0
      ) {
        fleet.skyships -= 1;
        attackerLossesCopy -= 1;
      } else if (fleet.levies > 0) {
        fleet.levies -= 1;
        attackerLossesCopy -= 1;
      } else if (fleet.regiments > 0) {
        fleet.regiments -= 1;
        attackerLossesCopy -= 2;
      }
    }
  });

  let remainingAttackers =
    attackerGarrisonedLevies + attackerGarrisonedRegiments;

  attackerFleets.forEach((fleet) => {
    if (fleet.location[0] === x && fleet.location[1] === y) {
      remainingAttackers += fleet.regiments + fleet.levies + fleet.skyships;
      if (fleet.regiments + fleet.levies + fleet.skyships === 0) {
        fleet.location = [4, 0];
        G.mapState.battleMap[y][x].splice(
          G.mapState.battleMap[y][x].indexOf(
            G.battleState?.attacker.id ?? ctx.currentPlayer
          ),
          1
        );
      }
    }
  });

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
    // GAP-15 sub-rule 3: record that this player failed conquest here this round
    G.failedConquests.push({
      playerId: G.battleState?.attacker.id ?? ctx.currentPlayer,
      tile: [x, y],
    });
    G.conquestState = undefined;
    findNextConquest(G, events);
  } else if (attackerHits >= tileStrength && remainingAttackers > 0) {
    logEvent(G, `Conquest succeeded: ${conquestPlayerName} colonises ${landName} (+1 VP)`);
    const currentPlayer =
      G.playerInfo[G.battleState?.attacker.id ?? ctx.currentPlayer];
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
        G.mapState.goodsPriceMarkers[good] = Math.max(1, G.mapState.goodsPriceMarkers[good] - qty);
      }
    });

    currentBuilding.player = currentPlayer;
    currentBuilding.buildings = "colony";
    G.conquestState = undefined;
    G.stage = "garrison troops";
  }
};
