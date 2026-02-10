import { Ctx } from "boardgame.io";
import { FleetInfo, MyGameState } from "../types";
import {
  findNextConquest,
  findNextGroundBattle,
  findNextPlayerInBattleSequence,
} from "./findNext";
import { drawFortuneOfWarCard } from "./helpers";

// FIX: Replaced explicit internal types with 'any' in function signatures
// or let them be inferred where possible.

export const resolveBattleAndReturnWinner = (
  G: MyGameState,
  events: any,
  ctx: Ctx
) => {
  const [x, y] = G.mapState.currentBattle;

  let attackerSwordValue = 0;
  let attackerShieldValue = 0;
  let attackerFleets: FleetInfo[] = [];

  // Safety check for battleState
  const attackerId = G.battleState?.attacker?.id ?? ctx.currentPlayer;
  
  if (G.playerInfo[attackerId]) {
    G.playerInfo[attackerId].fleetInfo.forEach((currentFleet) => {
        if (currentFleet.location[0] === x && currentFleet.location[1] === y) {
        attackerSwordValue +=
            currentFleet.skyships +
            currentFleet.levies +
            currentFleet.regiments * 2;
        attackerShieldValue += currentFleet.skyships;
        attackerFleets.push(currentFleet);
        }
    });
  }

  attackerSwordValue += G.battleState?.attacker?.fowCard?.sword ?? 0;
  attackerShieldValue += G.battleState?.attacker?.fowCard?.shield ?? 0;

  let defenderSwordValue = 0;
  let defenderShieldValue = 0;
  let defenderFleets: FleetInfo[] = [];

  // Safety check for battleState defender
  const defenderId = G.battleState?.defender?.id ?? ctx.currentPlayer; // Fallback might need logic check
  
  if (G.playerInfo[defenderId]) {
      G.playerInfo[defenderId].fleetInfo.forEach((currentFleet) => {
        if (currentFleet.location[0] === x && currentFleet.location[1] === y) {
        defenderSwordValue +=
            currentFleet.skyships +
            currentFleet.levies +
            currentFleet.regiments * 2;
        defenderShieldValue += currentFleet.skyships;
        defenderFleets.push(currentFleet);
        }
    });
  }

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
  defenderSwordValue += G.battleState?.defender?.fowCard?.sword ?? 0;
  defenderShieldValue += G.battleState?.defender?.fowCard?.shield ?? 0;

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
      ? G.battleState?.defender?.id
      : G.battleState?.attacker?.id;

  let remainingAttackers = 0;
  let remainingDefenders = 0;

  attackerFleets.forEach((fleet) => {
    if (fleet.location[0] === x && fleet.location[1] === y) {
      remainingAttackers += fleet.regiments + fleet.levies + fleet.skyships;
      if (fleet.regiments + fleet.levies + fleet.skyships === 0) {
        fleet.location = [4, 0];
        // Ensure battleMap exists before splicing
        if (G.mapState.battleMap[y][x]) {
            const index = G.mapState.battleMap[y][x].indexOf(
                G.battleState?.attacker?.id ?? ctx.currentPlayer
            );
            if (index > -1) {
                G.mapState.battleMap[y][x].splice(index, 1);
            }
        }
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
           // Ensure battleMap exists before splicing
           if (G.mapState.battleMap[y][x]) {
                const index = G.mapState.battleMap[y][x].indexOf(
                    G.battleState?.defender?.id ?? ctx.currentPlayer
                );
                if (index > -1) {
                    G.mapState.battleMap[y][x].splice(index, 1);
                }
           }
        }
      }
    });
  }
  if (remainingAttackers === 0 && remainingDefenders > 0) {
    winner = G.battleState?.defender?.id;
  } else if (remainingDefenders === 0 && remainingAttackers > 0) {
    winner = G.battleState?.attacker?.id;
  } else if (remainingAttackers === 0 && remainingDefenders === 0) {
    winner = "total annihilation";
  }
  if (remainingDefenders > 0 && ctx.phase === "ground_battle") {
    winner = G.battleState?.defender?.id;
  }
  
  // Logic for declaring winner
  if (winner !== "total annihilation" && winner) {
    // We need to iterate over playerInfo to reward winner, 
    // but the original code iterates 'G.battleState' which seems to hold player objects?
    // Assuming G.battleState has attacker and defender objects with player properties.
    if (G.battleState) {
        const participants = [G.battleState.attacker, G.battleState.defender];
        participants.forEach(player => {
            if (player && player.id === winner) {
                if (
                    G.battleState?.attacker?.hereticOrOrthodox !==
                    G.battleState?.defender?.hereticOrOrthodox
                  ) {
                    if (player.hereticOrOrthodox === "heretic") {
                      player.heresyTracker += 1;
                    } else {
                      player.heresyTracker -= 1;
                    }
                  }
                  player.victorious = true;
                  player.resources.victoryPoints += 1;
            } else if (player) {
                player.victorious = false;
            }
        })
    }
    
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
          G.battleState?.attacker?.id ?? ctx.currentPlayer,
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
        G.battleState?.attacker?.id ?? ctx.currentPlayer,
        ctx,
        G,
        events
      );
    }
  }
};

export const resolveConquest = (
  G: MyGameState,
  events: any,
  ctx: Ctx,
  random: any
) => {
  const [x, y] = G.mapState.currentBattle;

  let attackerSwordValue = 0;
  let attackerShieldValue = 0;
  let attackerFleets: FleetInfo[] = [];

  const attackerId = G.battleState?.attacker?.id ?? ctx.currentPlayer;

  if (G.playerInfo[attackerId]) {
    G.playerInfo[attackerId].fleetInfo.forEach((currentFleet) => {
        if (currentFleet.location[0] === x && currentFleet.location[1] === y) {
        attackerSwordValue +=
            currentFleet.skyships +
            currentFleet.levies +
            currentFleet.regiments * 2;
        attackerShieldValue += currentFleet.skyships;
        attackerFleets.push(currentFleet);
        }
    });
  }

  let attackerGarrisonedRegiments =
    G.mapState.buildings[y][x].garrisonedRegiments || 0;

  let attackerGarrisonedLevies = G.mapState.buildings[y][x].garrisonedLevies || 0;

  attackerSwordValue += attackerGarrisonedRegiments * 2;

  attackerSwordValue += attackerGarrisonedLevies;

  attackerSwordValue += G.battleState?.attacker?.fowCard?.sword ?? 0;
  attackerShieldValue += G.battleState?.attacker?.fowCard?.shield ?? 0;

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
        if (G.mapState.battleMap[y][x]) {
            const index = G.mapState.battleMap[y][x].indexOf(
                G.battleState?.attacker?.id ?? ctx.currentPlayer
            );
            if (index > -1) {
                G.mapState.battleMap[y][x].splice(index, 1);
            }
        }
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
            currentBuilding.garrisonedRegiments! // Assumed defined per logic
          );
          fleet.regiments += lowerAmount;
          currentBuilding.garrisonedRegiments! -= lowerAmount;
        }
      });
    }
    if (currentBuilding.garrisonedLevies > 0) {
      attackerFleets.forEach((fleet) => {
        const difference = fleet.skyships - (fleet.levies + fleet.regiments);
        if (difference > 0) {
          const lowerAmount = Math.min(
            difference,
            currentBuilding.garrisonedLevies!
          );
          fleet.regiments += lowerAmount;
          currentBuilding.garrisonedLevies! -= lowerAmount;
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
      G.playerInfo[G.battleState?.attacker?.id ?? ctx.currentPlayer];
    const currentBuilding = G.mapState.buildings[y][x];
    const currentTile = G.mapState.currentTileArray[y][x];

    if (currentTile.loot?.colony) {
        Object.entries(currentTile.loot.colony).forEach(([lootName, value]) => {
        // Safe casting or check if currentPlayer.resources has index signature
        // Assuming MyGameState types are loose enough or exact match
        (currentPlayer.resources as any)[lootName] += value;
        });
    }
    currentPlayer.resources.victoryPoints += 1;
    currentPlayer.heresyTracker += 1;

    currentBuilding.player = currentPlayer;
    currentBuilding.buildings = "colony";
    console.log("Setting stage for the garrison of troops");
    G.conquestState = undefined;
    G.stage = "garrison troops";
  }
};