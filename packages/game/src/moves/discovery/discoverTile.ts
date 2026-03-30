import { INVALID_MOVE } from "boardgame.io/core/";
import { MoveDefinition } from "../../types";
import { advanceAllHeresyTrackers, logEvent, allPlayersPassed } from "../../helpers/stateUtils";
import { getNeighbors } from "../../helpers/mapUtils";
import { MIN_ROUNDS } from "../../data/gameData";

export const discoverTile: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args: any[]) => {
    const [x, y] = args[0];
    if (G.mapState.discoveredTiles[y][x]) {
      return INVALID_MOVE;
    }
    const edgeNeighbors = getNeighbors(x, y, true);
    let bordered = false;

    if (!ctx.numMoves) {
      // First flip: must be adjacent to any discovered tile
      bordered = edgeNeighbors.some(
        ([nx, ny]) => G.mapState.discoveredTiles[ny][nx]
      );
    } else {
      // Cascade flip: must be adjacent to the most recently discovered tile
      const [lx, ly] = G.mapState.mostRecentlyDiscoveredTile;
      bordered = edgeNeighbors.some(([nx, ny]) => nx === lx && ny === ly);

      // Cascade fallback: if the last tile has no hidden edge-neighbors,
      // allow any tile adjacent to any revealed tile (discovery rule)
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
      logEvent(G, `Legend discovered: ${currentTile.name} — all heresy advances`);
    } else if (tileRace !== "ocean" && !G.mapState.discoveredRaces.includes(tileRace)) {
      advanceAllHeresyTrackers(G);
      G.mapState.discoveredRaces.push(tileRace);
      logEvent(G, `New race discovered: ${tileRace} — all heresy advances`);
    } else if (currentTile.type !== "ocean") {
      logEvent(G, `Tile discovered: ${currentTile.name}`);
    }
    G.mapState.discoveredTiles[y][x] = true;
    G.mapState.mostRecentlyDiscoveredTile = [x, y];
    G.firstTurnOfRound = false;

    // Race to Discovery: count tiles discovered per player
    if (G.eventState.raceToDiscoveryCounters && playerID) {
      G.eventState.raceToDiscoveryCounters[playerID] =
        (G.eventState.raceToDiscoveryCounters[playerID] ?? 0) + 1;
    }

    let allDiscovered = true;
    Object.values(G.mapState.discoveredTiles).forEach((tileRow) => {
      tileRow.forEach((tile) => {
        if (!tile) {
          allDiscovered = false;
        }
      });
    });

    if (allDiscovered) {
      // Variable-length game: play until all tiles discovered, minimum MIN_ROUNDS
      if (G.round >= MIN_ROUNDS) {
        G.finalRound = G.round; // all discovered this round — end the round
      } else {
        G.finalRound = MIN_ROUNDS; // not yet at minimum — play to round 6
      }
      G.mustContinueDiscovery = false;
      events.endPhase();
      return;
    }

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
