import { MoveDefinition, GoodKey } from "../../types.js";
import { nextAfterPlunder } from "../../helpers/resolutionSequencer.js";
import { increaseHeresyWithinMove, logEvent } from "../../helpers/stateUtils.js";
import { humanizeTileName } from "../../helpers/helpers.js";
import { PRICE_MARKER_MIN } from "../../data/gameData.js";

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
    GOODS.forEach((good) => {
      const qty = currentTile.loot.colony[good];
      if (qty > 0) {
        G.mapState.goodsPriceMarkers[good] = Math.max(PRICE_MARKER_MIN, G.mapState.goodsPriceMarkers[good] - qty);
      }
    });
    // plundering a Legend advances the plunderer's heresy by 1
    increaseHeresyWithinMove(G, playerID);

    const landName = humanizeTileName(currentTile?.name ?? "unknown land");
    logEvent(G, `${currentPlayer.kingdomName} plunders ${landName} (+1 heresy)`);
    nextAfterPlunder(G, events);
  },
  errorMessage: "Cannot plunder right now",
};

export default plunder;
