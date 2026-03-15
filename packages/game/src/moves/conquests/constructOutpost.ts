import { Move } from "boardgame.io";
import { MyGameState, GoodKey } from "../../types";

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

const constructOutpost: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const [x, y] = G.mapState.currentBattle;
  const currentPlayer = G.playerInfo[playerID];
  const currentBuilding = G.mapState.buildings[y][x];
  const currentTile = G.mapState.currentTileArray[y][x];

  currentBuilding.player = currentPlayer;
  currentBuilding.buildings = "outpost";

  // Move price markers left for outpost goods ("To Claim" rule)
  GOODS.forEach((good) => {
    const qty = currentTile.loot.outpost[good];
    if (qty > 0) {
      G.mapState.goodsPriceMarkers[good] = Math.max(1, G.mapState.goodsPriceMarkers[good] - qty);
    }
  });

  Object.entries(currentTile.loot.outpost).forEach(([lootName, value]) => {
    const lootNameAsResource = lootName as keyof typeof currentTile.loot.colony;
    currentPlayer.resources[lootNameAsResource] += value;
  });

  currentPlayer.resources.victoryPoints += 1;
  currentPlayer.heresyTracker += 1;

  G.stage = "garrison troops";
};

export default constructOutpost;
