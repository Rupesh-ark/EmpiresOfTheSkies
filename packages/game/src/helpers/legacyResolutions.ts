import { MyGameState, PlayerInfo } from "../types";

const legacyResolutions = (G: MyGameState) => {
  Object.values(G.playerInfo).forEach((player) => {
    switch (player.resources.legacyCard) {
      case "the builder":
        theBuilder(player, G);
        break;
      case "the conqueror":
        theConqueror(player, G);
        break;
      case "the explorer":
        theExplorer(player, G);
        break;
      case "the great":
        theGreat(player, G);
        break;
      case "the magnificent":
        theMagnificent(player);
        break;
      case "the merchant":
        theMerchant(player, G);
        break;
      case "the mighty":
        theMighty(player, G);
        break;
      case "the navigator":
        theNavigator(player);
        break;
      case "the pious":
        thePious(player);
        break;
    }
  });
};

const theBuilder = (player: PlayerInfo, G: MyGameState) => {
  let totalBonus = 0;

  totalBonus += player.cathedrals * 2;
  totalBonus += player.palaces * 2;
  totalBonus += player.shipyards * 2;

  G.mapState.buildings.forEach((tileRow) => {
    tileRow.forEach((tile) => {
      if (tile.fort === true && tile.player?.id === player.id) {
        totalBonus += 2;
      }
    });
  });

  player.resources.victoryPoints += totalBonus;
};

const theConqueror = (player: PlayerInfo, G: MyGameState) => {
  G.mapState.buildings.forEach((tileRow) => {
    tileRow.forEach((tile) => {
      if (tile.player?.id === player.id && tile.buildings === "colony") {
        player.resources.victoryPoints += 6;
      }
    });
  });
};

const theExplorer = (player: PlayerInfo, G: MyGameState) => {
  G.mapState.buildings.forEach((tileRow) => {
    tileRow.forEach((tile) => {
      if (
        tile.player?.id === player.id &&
        (tile.buildings === "colony" || tile.buildings === "outpost")
      ) {
        player.resources.victoryPoints += 4;
      }
    });
  });
};

const theGreat = (player: PlayerInfo, G: MyGameState) => {
  const playerToCathedralMap: Record<string, number> = {};
  const playerToPalaceMap: Record<string, number> = {};

  const playerToSkyshipsMap: Record<string, number> = {};
  const playerToRegimentMap: Record<string, number> = {};

  const playerToOutpostMap: Record<string, number> = {};
  const playerToColonyMap: Record<string, number> = {};
  const playerToFortMap: Record<string, number> = {};

  const playerToTradeGainsMap: Record<string, number> = {};

  Object.values(G.playerInfo).forEach((playerInfo) => {
    playerToCathedralMap[playerInfo.id] = playerInfo.cathedrals;
    playerToPalaceMap[playerInfo.id] = playerInfo.palaces;

    playerToSkyshipsMap[playerInfo.id] = playerInfo.resources.skyships;
    playerToRegimentMap[playerInfo.id] = playerInfo.resources.regiments;

    playerInfo.fleetInfo.forEach((fleet) => {
      playerToSkyshipsMap[playerInfo.id] += fleet.skyships;
      playerToRegimentMap[playerInfo.id] += fleet.regiments;
    });

    playerToColonyMap[playerInfo.id] = 0;
    playerToOutpostMap[playerInfo.id] = 0;
    playerToFortMap[playerInfo.id] = 0;
    playerToTradeGainsMap[playerInfo.id] = 0;
  });

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      const tile = G.mapState.buildings[y][x];
      const lootTile = G.mapState.currentTileArray[y][x];
      if (tile.player) {
        if (tile.buildings === "colony") {
          playerToColonyMap[tile.player.id] += 1;
        } else if (tile.buildings === "outpost") {
          playerToOutpostMap[tile.player.id] += 1;
        }
        if (tile.fort) {
          playerToFortMap[tile.player.id] += 1;
        }
        if (tile.buildings) {
          Object.entries(lootTile.loot[tile.buildings]).forEach(
            ([lootName, lootAmount]) => {
              if (lootName !== "gold" && lootName !== "victoryPoints") {
                if (tile.player)
                  playerToTradeGainsMap[tile.player.id] += lootAmount;
              }
            }
          );
        }
      }
    }
  }

  const maxCathedrals = Math.max(...Object.values(playerToCathedralMap));
  const maxPalaces = Math.max(...Object.values(playerToPalaceMap));
  const maxSkyships = Math.max(...Object.values(playerToSkyshipsMap));
  const maxRegiments = Math.max(...Object.values(playerToRegimentMap));
  const maxOutposts = Math.max(...Object.values(playerToOutpostMap));
  const maxColonies = Math.max(...Object.values(playerToColonyMap));
  const maxForts = Math.max(...Object.values(playerToFortMap));
  const maxTrade = Math.max(...Object.values(playerToTradeGainsMap));

  if (playerToCathedralMap[player.id] >= maxCathedrals) {
    player.resources.victoryPoints += 4;
  }
  if (playerToPalaceMap[player.id] >= maxPalaces) {
    player.resources.victoryPoints += 4;
  }
  if (playerToSkyshipsMap[player.id] >= maxSkyships) {
    player.resources.victoryPoints += 4;
  }
  if (playerToRegimentMap[player.id] >= maxRegiments) {
    player.resources.victoryPoints += 4;
  }
  if (playerToOutpostMap[player.id] >= maxOutposts) {
    player.resources.victoryPoints += 4;
  }
  if (playerToColonyMap[player.id] >= maxColonies) {
    player.resources.victoryPoints += 4;
  }
  if (playerToFortMap[player.id] >= maxForts) {
    player.resources.victoryPoints += 4;
  }
  if (playerToTradeGainsMap[player.id] >= maxTrade) {
    player.resources.victoryPoints += 4;
  }
};

const theMagnificent = (player: PlayerInfo) => {
  player.resources.victoryPoints += player.palaces * 4;
};

const theMerchant = (player: PlayerInfo, G: MyGameState) => {
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      const tile = G.mapState.buildings[y][x];
      const lootTile = G.mapState.currentTileArray[y][x];
      if (tile.player?.id === player.id) {
        if (tile.buildings) {
          Object.entries(lootTile.loot[tile.buildings]).forEach(
            ([lootName, lootAmount]) => {
              if (lootName !== "gold" && lootName !== "victoryPoints") {
                if (tile.player)
                  player.resources.victoryPoints += lootAmount * 2;
              }
            }
          );
        }
      }
    }
  }
};

const theMighty = (player: PlayerInfo, G: MyGameState) => {
  let totalBonus = 0;

  G.mapState.buildings.forEach((tileRow) => {
    tileRow.forEach((tile) => {
      if (tile.fort === true && tile.player?.id === player.id) {
        totalBonus += 1;
      }
    });
  });

  let totalRegiments = 0;
  let totalDeployedSkyships = 0;

  player.fleetInfo.forEach((fleet) => {
    totalDeployedSkyships += fleet.skyships;
    totalRegiments += fleet.regiments;
  });

  totalRegiments += player.resources.regiments;

  totalBonus += totalDeployedSkyships;

  totalBonus += Math.floor(totalRegiments / 3);

  player.resources.victoryPoints += totalBonus;
};

const theNavigator = (player: PlayerInfo) => {
  let totalBonus = 0;

  totalBonus += player.resources.skyships;

  player.fleetInfo.forEach((fleet) => {
    totalBonus += fleet.skyships;
  });

  player.resources.victoryPoints += totalBonus;
};

const thePious = (player: PlayerInfo) => {
  player.resources.victoryPoints += player.cathedrals * 4;
};

export default legacyResolutions;
