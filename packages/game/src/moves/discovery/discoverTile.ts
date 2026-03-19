import { INVALID_MOVE } from "boardgame.io/core/";
import { MoveDefinition } from "../../types";
import { advanceAllHeresyTrackers, logEvent, allPlayersPassed } from "../../helpers/stateUtils";
import { getNeighbors } from "../../helpers/mapUtils";

export const discoverTile: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args: any[]) => {
    const [x, y] = args[0];
    if (G.mapState.discoveredTiles[y][x]) {
      return INVALID_MOVE;
    }
    const edgeNeighbors = getNeighbors(x, y, true);
    let bordered = false;

    if (ctx.numMoves === 0) {
      // First flip: must be adjacent to any discovered tile
      bordered = edgeNeighbors.some(
        ([nx, ny]) => G.mapState.discoveredTiles[ny][nx]
      );
    } else {
      // Cascade flip: must be adjacent to the most recently discovered tile
      const [lx, ly] = G.mapState.mostRecentlyDiscoveredTile;
      bordered = edgeNeighbors.some(([nx, ny]) => nx === lx && ny === ly);

      // Cascade fallback: if the last tile has no hidden edge-neighbors,
      // allow any tile adjacent to any revealed tile (v4.2 discovery rule)
      if (!bordered) {
        const lastTileNeighbors = getNeighbors(lx, ly, true);
        const hasHiddenNeighbor = lastTileNeighbors.some(
          ([nx, ny]) => !G.mapState.discoveredTiles[ny][nx]
        );
        if (!hasHiddenNeighbor) {
          bordered = edgeNeighbors.some(
            ([nx, ny]) => G.mapState.discoveredTiles[ny][nx]
          );
        }
      }
    }

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
  },
  errorMessage: "Cannot discover this tile",
};

export default discoverTile;
