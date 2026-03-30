import { Ctx } from "boardgame.io";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { FleetInfo, MyGameState } from "../types";
import {
  findNextConquest,
  findNextGroundBattle,
  findNextPlayerInBattleSequence,
} from "./findNext";
import { drawFortuneOfWarCard } from "./helpers";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";

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

  const attackerLosses = defenderSwordValue - attackerShieldValue;
  let attackerLossesCopy = attackerLosses.valueOf();
  console.log(`attacker losses = ${attackerLossesCopy}`);

  const defenderLosses = attackerSwordValue - defenderShieldValue;
  let defenderLossesCopy = defenderLosses.valueOf();
  console.log(`defender losses = ${defenderLossesCopy}`);

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
  if (ctx.phase === "ground_battle") {
    const currentBuilding = G.mapState.buildings[y][x];
    while (
      defenderLossesCopy > 0 &&
      currentBuilding.garrisonedLevies &&
      currentBuilding.garrisonedRegiments &&
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
    defenderFleets.forEach((fleet) => {
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
    });
  }

  let winner =
    attackerLosses > defenderLosses
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
    G.battleState &&
      Object.values(G.battleState).forEach((player) => {
        if (player.id === winner) {
          if (
            G.battleState?.attacker.hereticOrOrthodox !==
            G.battleState?.defender.hereticOrOrthodox
          ) {
            if (player.hereticOrOrthodox === "heretic") {
              player.heresyTracker += 1;
            } else {
              player.heresyTracker -= 1;
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
      if (ctx.phase === "ground battle") {
        findNextGroundBattle(G, events);
      } else {
        G.stage = "relocate loser";
        events.endTurn({ next: winner });
      }
    }
  } else {
    if (ctx.phase === "ground battle") {
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

  attackerSwordValue += G.battleState?.attacker.fowCard?.sword ?? 0;
  attackerShieldValue += G.battleState?.attacker.fowCard?.shield ?? 0;

  const defenderCard = drawFortuneOfWarCard(G);

  const defenderSwordValue =
    G.mapState.currentTileArray[y][x].sword + defenderCard.sword;
  const defenderShieldValue =
    G.mapState.currentTileArray[y][x].shield + defenderCard.shield;

  const attackerLosses = defenderSwordValue - attackerShieldValue;
  let attackerLossesCopy = attackerLosses.valueOf();
  console.log(`attacker losses = ${attackerLossesCopy}`);

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

  console.log(
    `Remaining attackers in colonisation attempt: ${remainingAttackers}`
  );
  const remainingDefenders =
    attackerSwordValue - (defenderShieldValue + defenderSwordValue);

  console.log(
    `Remaining defenders in colonisation attempt: ${remainingDefenders}`
  );

  if (remainingDefenders > 0 || remainingAttackers < 1) {
    console.log("Attacker has failed their conquest attempt");
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
    G.conquestState = undefined;
    findNextConquest(G, events);
  } else if (remainingDefenders <= 0 && remainingAttackers > 0) {
    console.log("Attacker has successfully colonised a region");
    const currentPlayer =
      G.playerInfo[G.battleState?.attacker.id ?? ctx.currentPlayer];
    const currentBuilding = G.mapState.buildings[y][x];
    const currentTile = G.mapState.currentTileArray[y][x];

    Object.entries(currentTile.loot.colony).forEach(([lootName, value]) => {
      const lootNameAsResource =
        lootName as keyof typeof currentTile.loot.colony;
      currentPlayer.resources[lootNameAsResource] += value;
    });
    currentPlayer.resources.victoryPoints += 1;
    currentPlayer.heresyTracker += 1;

    currentBuilding.player = currentPlayer;
    currentBuilding.buildings = "colony";
    console.log("Setting stage for the garrison of troops");
    G.conquestState = undefined;
    G.stage = "garrison troops";
  }
};
