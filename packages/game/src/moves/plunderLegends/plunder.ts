import { MoveDefinition, GoodKey } from "../../types";
import { findNextPlunder } from "../../helpers/findNext";
import { increaseHeresyWithinMove, logEvent } from "../../helpers/stateUtils";
import { PRICE_MARKER_MIN } from "../../data/gameData";

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

const plunder: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    const currentPlayer = G.playerInfo[playerID];
    const [x, y] = G.mapState.currentBattle;
    const currentTile = G.mapState.currentTileArray[y][x];

    Object.entries(currentTile.loot.colony).forEach(([lootName, lootAmount]) => {
      const lootNameAsResource = lootName as keyof typeof currentTile.loot.colony;
      currentPlayer.resources[lootNameAsResource] += lootAmount;
    });
    // GAP-CQ1: shift price markers left for goods plundered from legend
    GOODS.forEach((good) => {
      const qty = currentTile.loot.colony[good];
      if (qty > 0) {
        G.mapState.goodsPriceMarkers[good] = Math.max(PRICE_MARKER_MIN, G.mapState.goodsPriceMarkers[good] - qty);
      }
    });
    // v4.2: plundering a Legend advances the plunderer's heresy by 1
    increaseHeresyWithinMove(G, playerID);

    const landName = currentTile?.name ?? "unknown land";
    logEvent(G, `${currentPlayer.kingdomName} plunders ${landName} (+1 heresy)`);
    findNextPlunder(G, events);
  },
  errorMessage: "Cannot plunder right now",
};

export default plunder;
