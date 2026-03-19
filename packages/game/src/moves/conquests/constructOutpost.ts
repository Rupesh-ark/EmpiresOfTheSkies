import { MoveDefinition, GoodKey } from "../../types";
import { increaseHeresyWithinMove } from "../../helpers/stateUtils";
import { PRICE_MARKER_MIN } from "../../codifiedGameInfo";

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

const constructOutpost: MoveDefinition = {
  fn: ({ G, playerID }, ...args) => {
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
        G.mapState.goodsPriceMarkers[good] = Math.max(PRICE_MARKER_MIN, G.mapState.goodsPriceMarkers[good] - qty);
      }
    });

    // GAP-RES1: goods are no longer granted immediately on claim —
    // they are recalculated each round via grantTradeRouteGoods in resolveRound.

    currentPlayer.resources.victoryPoints += 1;
    increaseHeresyWithinMove(G, playerID);

    G.stage = "garrison troops";
  },
  errorMessage: "Cannot construct an outpost here",
};

export default constructOutpost;
