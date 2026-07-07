import { MyGameState, GoodKey } from "../types";
import { FAITHDOM_TILES, tileKey, bfsReachable, buildPlayerNetwork } from "./mapUtils";
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
    const playerNetwork = buildPlayerNetwork(G, playerID);
    let goldGained = 0;
    let goodsGained = 0;
    let connectedLands = 0;
    let disconnectedLands = 0;

    for (let y = 0; y < G.mapState.buildings.length; y++) {
      for (let x = 0; x < G.mapState.buildings[y].length; x++) {
        const building = G.mapState.buildings[y][x];
        if (building.player?.id !== playerID || !building.buildings) continue;
        if (building.buildings !== "outpost" && building.buildings !== "colony") continue;

        // Add the building's tile to the network (the ownership skyship sits here)
        const network = new Set(playerNetwork);
        network.add(tileKey(x, y));

        // Check if this tile is reachable from Faithdom (respecting mountains)
        const reachable = bfsReachable(FAITHDOM_TILES, network, G.mapState.currentTileArray);
        if (!reachable.has(tileKey(x, y))) {
          disconnectedLands++;
          continue;
        }
        connectedLands++;

        // Grant goods and gold based on building type
        const loot = G.mapState.currentTileArray[y][x].loot[building.buildings];

        // Grant gold
        if (loot.gold) {
          G.playerInfo[playerID].resources.gold += loot.gold;
          goldGained += loot.gold;
        }

        // Grant goods
        GOODS.forEach((good) => {
          if (loot[good] > 0) {
            G.playerInfo[playerID].resources[good] += loot[good];
            goodsGained += loot[good];
          }
        });
      }
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
