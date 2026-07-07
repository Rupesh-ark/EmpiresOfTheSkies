import { MyGameState, GoodKey } from "../types";
import {
  FAITHDOM_TILES,
  bfsReachable,
  buildPlayerNetwork,
  getPlayerBuildings,
  isBuildingConnected,
} from "./mapUtils";
import { logEvent } from "./stateUtils";

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

/**
 * GAP-RES1: Grant goods and gold from trade routes to each player.
 *
 * For each player, BFS from Faithdom through their skyship chain.
 * Connected outposts grant top-row loot. Connected colonies grant both rows.
 * Disconnected outposts/colonies grant nothing.
 *
 * This runs BEFORE goods selling in resolveRound — goods are recalculated
 * fresh each round. Plunder/smuggler goods may already be on player.resources
 * from earlier phases — this function ADDS to them, never zeroes first.
 */
export const grantTradeRouteGoods = (G: MyGameState): void => {
  Object.keys(G.playerInfo).forEach((playerID) => {
    const tileArray = G.mapState.currentTileArray;
    const network = buildPlayerNetwork(G, playerID);
    // One BFS per player; each building then only needs an adjacency check.
    const reachable = bfsReachable(FAITHDOM_TILES, network, tileArray);
    let goldGained = 0;
    let goodsGained = 0;
    let connectedLands = 0;
    let disconnectedLands = 0;

    for (const [x, y] of getPlayerBuildings(G, playerID)) {
      if (!isBuildingConnected(x, y, reachable, tileArray)) {
        disconnectedLands++;
        continue;
      }
      connectedLands++;

      const building = G.mapState.buildings[y][x];
      const loot = tileArray[y][x].loot[building.buildings as "outpost" | "colony"];

      if (loot.gold) {
        G.playerInfo[playerID].resources.gold += loot.gold;
        goldGained += loot.gold;
      }

      GOODS.forEach((good) => {
        if (loot[good] > 0) {
          G.playerInfo[playerID].resources[good] += loot[good];
          goodsGained += loot[good];
        }
      });
    }

    const kingdom = G.playerInfo[playerID].kingdomName;
    if (connectedLands > 0) {
      logEvent(
        G,
        `Trade routes: ${kingdom} collects ${goldGained} Gold and ${goodsGained} Goods from ${connectedLands} connected Land(s)` +
          (disconnectedLands > 0 ? ` — ${disconnectedLands} Land(s) unconnected earned nothing` : "")
      );
    } else if (disconnectedLands > 0) {
      logEvent(G, `Trade routes: ${kingdom} has ${disconnectedLands} Land(s) with no route to Faithdom — no trade income`);
    }
  });
};
