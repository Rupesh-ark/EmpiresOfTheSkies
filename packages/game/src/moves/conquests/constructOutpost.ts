import { MoveDefinition, GoodKey } from "../../types.js";
import { increaseHeresyWithinMove, addVPAmount, logEvent, toBuildingOwner } from "../../helpers/stateUtils.js";
import { humanizeTileName } from "../../helpers/helpers.js";
import { PRICE_MARKER_MIN } from "../../data/gameData.js";
import { computeGarrisonTroops } from "../../helpers/resolveBattle.js";
import {
  FAITHDOM_TILES,
  bfsReachable,
  buildPlayerNetwork,
  isBuildingConnected,
} from "../../helpers/mapUtils.js";

const GOODS: GoodKey[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];

const constructOutpost: MoveDefinition = {
  fn: ({ G, playerID }, ...args) => {
    const [x, y] = G.mapState.currentBattle;
    const currentPlayer = G.playerInfo[playerID];
    const currentBuilding = G.mapState.buildings[y][x];
    const currentTile = G.mapState.currentTileArray[y][x];
    const isFirstClaim = !currentBuilding.buildings;
    const reachableRoute = bfsReachable(
      FAITHDOM_TILES,
      buildPlayerNetwork(G, playerID),
      G.mapState.currentTileArray
    );
    const hasEstablishedRoute = isBuildingConnected(
      x,
      y,
      reachableRoute,
      G.mapState.currentTileArray
    );

    currentBuilding.player = toBuildingOwner(currentPlayer);
    currentBuilding.buildings = "outpost";

    // eots42:453: price markers move only on the first claim and only when
    // the ownership skyship completes an established route to Faithdom.
    if (isFirstClaim && hasEstablishedRoute) {
      GOODS.forEach((good) => {
        const qty = currentTile.loot.outpost[good];
        if (qty > 0) {
          G.mapState.goodsPriceMarkers[good] = Math.max(PRICE_MARKER_MIN, G.mapState.goodsPriceMarkers[good] - qty);
        }
      });
    }

    currentPlayer.resources.victoryPoints += 1;
    increaseHeresyWithinMove(G, playerID);

    // Royal Patronage: first player to claim a Land this round
    if (G.eventState.royalPatronageActive) {
      addVPAmount(G, playerID, 2);
      currentPlayer.resources.gold += 2;
      logEvent(G, `Royal Patronage: ${currentPlayer.kingdomName} is first to claim — +2 VP and 2 gold`);
      G.eventState.royalPatronageActive = false;
    }

    G.step = "conquest_garrison";
    computeGarrisonTroops(G, playerID);
  },
  errorMessage: "Cannot construct an outpost here",
  successLog: (G, pid) => {
    const [x, y] = G.mapState.currentBattle;
    const landName = humanizeTileName(G.mapState.currentTileArray[y][x]?.name ?? `[${x},${y}]`);
    const k = G.playerInfo[pid].kingdomName;
    return `${k} constructs an outpost at ${landName}`;
  },
};

export default constructOutpost;
