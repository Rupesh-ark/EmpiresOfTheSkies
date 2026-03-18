import { INVALID_MOVE } from "boardgame.io/core/";
import { MyGameState } from "../../types";
import { Move } from "boardgame.io";
import { advanceAllHeresyTrackers, logEvent, allPlayersPassed } from "../../helpers/stateUtils";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

export const discoverTile: Move<MyGameState> = (
  {
    G,
    ctx,
    playerID,
    events,
    random,
  }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
    random: RandomAPI;
  },
  ...args: any[]
) => {
  const [x, y] = args[0];
  if (G.mapState.discoveredTiles[y][x]) {
    return INVALID_MOVE;
  }
  const borderingTiles: number[][] = [
    [x, y - 1 < 0 ? 0 : y - 1],
    [x, y + 1 > 3 ? 3 : y + 1],
    [(((x - 1) % 8) + 8) % 8, y],
    [(((x + 1) % 8) + 8) % 8, y],
  ];
  let bordered = false;

  borderingTiles.forEach((coords) => {
    if (ctx.numMoves === 0) {
      if (G.mapState.discoveredTiles[coords[1]][coords[0]]) {
        bordered = true;
      }
    } else {
      if (
        coords[0] === G.mapState.mostRecentlyDiscoveredTile[0] &&
        coords[1] === G.mapState.mostRecentlyDiscoveredTile[1]
      ) {
        bordered = true;
      }
    }
  });
  if (!bordered) {
    return INVALID_MOVE;
  }
  const currentTile = G.mapState.currentTileArray[y][x];
  // splits the tile name on any number
  const tileRace = currentTile.name.split(/(\d+)/)[0].toLowerCase();

  if (currentTile.type === "legend") {
    advanceAllHeresyTrackers(G);
    logEvent(G, `Legend discovered: ${currentTile.name} \u2014 all heresy advances`);
  } else if (tileRace !== "ocean" && !G.mapState.discoveredRaces.includes(tileRace)) {
    advanceAllHeresyTrackers(G);
    G.mapState.discoveredRaces.push(tileRace);
    logEvent(G, `New race discovered: ${tileRace} \u2014 all heresy advances`);
  } else if (currentTile.type !== "ocean") {
    logEvent(G, `Tile discovered: ${currentTile.name}`);
  }
  G.mapState.discoveredTiles[y][x] = true;
  G.mapState.mostRecentlyDiscoveredTile = [x, y];
  G.firstTurnOfRound = false;

  let allDiscovered = true;
  Object.values(G.mapState.discoveredTiles).forEach((tileRow) => {
    tileRow.forEach((tile) => {
      if (!tile) {
        allDiscovered = false;
      }
    });
  });

  if (allDiscovered) {
    G.mustContinueDiscovery = false;
    events.endPhase();
    return;
  }

  // GAP-24: Discovery cascade — Ocean/Legend tiles don't count as Land; player must flip again
  if (currentTile.type === "ocean" || currentTile.type === "legend") {
    G.mustContinueDiscovery = true;
    // Do NOT end turn — player must flip an adjacent tile
  } else {
    // Land (or home/infidel_empire) tile found — cascade satisfied
    G.mustContinueDiscovery = false;
    // Land tile found — mark player as done with discovery
    G.playerInfo[playerID].passed = true;
    if (allPlayersPassed(G)) {
      events.endPhase();
    } else {
      events.endTurn();
    }
  }
};

export default discoverTile;
