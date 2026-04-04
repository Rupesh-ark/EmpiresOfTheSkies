import { MoveDefinition, PlayerInfo } from "../../types";
import { allPlayersPassed } from "../../helpers/stateUtils";
import { KINGDOM_LOCATION } from "../../data/gameData";
import { tileKey, FAITHDOM_TILES } from "../../helpers/mapUtils";

export type RetrieveOptions = {
  placeAt?: number[];
  trailFrom?: number[];
};

function sanitizeFleetValue(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || isNaN(val)) {
    console.warn(`[retrieveFleets] Invalid fleet value: ${val}, defaulting to ${fallback}`);
    return fallback;
  }
  return val;
}

function placeRouteSkyship(
  G: Parameters<MoveDefinition["fn"]>[0]["G"],
  playerID: string,
  x: number, y: number,
  fleet: PlayerInfo["fleetInfo"][number],
): boolean {
  if (fleet.skyships <= 0) return false;
  const key = tileKey(x, y);
  // Skip Faithdom tiles — no route skyship needed there
  if (FAITHDOM_TILES.some(([fx, fy]) => fx === x && fy === y)) return false;
  const existing = G.mapState.routeSkyships[key] ?? [];
  if (existing.includes(playerID)) return false; // already has one here
  existing.push(playerID);
  G.mapState.routeSkyships[key] = existing;
  fleet.skyships -= 1;
  return true;
}

const retrieveFleets: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    const fleets: number[] = args[0];
    const options: RetrieveOptions | undefined = args[1];

    if (fleets.length > 0) {
      fleets.forEach((fleetId) => {
        const currentPlayer: PlayerInfo = G.playerInfo[playerID];
        const currentFleet = currentPlayer.fleetInfo[fleetId];
        const oldLocation = currentFleet.location;

        if (options?.placeAt?.includes(fleetId)) {
          placeRouteSkyship(G, playerID, oldLocation[0], oldLocation[1], currentFleet);
        } else if (options?.trailFrom?.includes(fleetId)) {
          for (const [px, py] of currentFleet.travelHistory) {
            if (currentFleet.skyships <= 0) break;
            const building = G.mapState.buildings[py]?.[px];
            if (building?.player?.id === playerID && building?.buildings) continue;
            placeRouteSkyship(G, playerID, px, py, currentFleet);
          }
        }

        currentFleet.travelHistory = [];

        currentFleet.location = [...KINGDOM_LOCATION];

        const fleetSkyships = sanitizeFleetValue(currentFleet.skyships);
        const fleetRegiments = sanitizeFleetValue(currentFleet.regiments);
        const fleetLevies = sanitizeFleetValue(currentFleet.levies);
        const fleetElite = sanitizeFleetValue(currentFleet.eliteRegiments);

        currentPlayer.resources.skyships += fleetSkyships;
        currentPlayer.resources.regiments += fleetRegiments;
        currentPlayer.resources.levies += fleetLevies;
        currentPlayer.resources.eliteRegiments += fleetElite;

        currentFleet.skyships = 0;
        currentFleet.regiments = 0;
        currentFleet.levies = 0;
        currentFleet.eliteRegiments = 0;
        let shouldScrubFromBattleMap = true;
        Object.values(currentPlayer.fleetInfo).forEach((fleet) => {
          const [fleetX, fleetY] = fleet.location;

          if (fleetX === oldLocation[0] && fleetY === oldLocation[1]) {
            shouldScrubFromBattleMap = false;
          }
        });

        if (shouldScrubFromBattleMap) {
          const currentBattleMapTile =
            G.mapState.battleMap[oldLocation[1]][oldLocation[0]];
          currentBattleMapTile.splice(currentBattleMapTile.indexOf(playerID), 1);
        }
      });
    }

    G.playerInfo[playerID].passed = true;
    const flags = Object.entries(G.playerInfo).map(([id, p]) => `${id}:${p.passed}`).join(" ");
    if (allPlayersPassed(G)) {
      console.log(`[RET] P${playerID} ALL PASSED → endPhase [${flags}]`);
      events.endPhase();
    } else {
      console.log(`[RET] P${playerID} not all → endTurn [${flags}]`);
      events.endTurn();
    }
  },
  errorMessage: "Cannot retrieve fleets right now",
};

export default retrieveFleets;
