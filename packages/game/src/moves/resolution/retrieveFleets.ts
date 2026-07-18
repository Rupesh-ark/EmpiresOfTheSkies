import { MoveDefinition, PlayerInfo } from "../../types.js";
import { allPlayersPassed, logEvent } from "../../helpers/stateUtils.js";
import { KINGDOM_LOCATION } from "../../data/gameData.js";
import { tileKey, getRoutePlacementTiles } from "../../helpers/mapUtils.js";
import log from "../../helpers/logger.js";

const retLog = log.child({ mod: "retrieve-fleets" });

export type RetrieveOptions = {
  placeAt?: number[];
  trailFrom?: number[];
};

function sanitizeFleetValue(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || isNaN(val)) {
    retLog.warn({ val, fallback }, "Invalid fleet value, defaulting");
    return fallback;
  }
  return val;
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

        // Sanitize BEFORE route placement: a NaN skyship count must not
        // slip past the budget check and hand out free route markers.
        currentFleet.skyships = sanitizeFleetValue(currentFleet.skyships);
        currentFleet.regiments = sanitizeFleetValue(currentFleet.regiments);
        currentFleet.levies = sanitizeFleetValue(currentFleet.levies);
        currentFleet.eliteRegiments = sanitizeFleetValue(currentFleet.eliteRegiments);

        const routeMode = options?.placeAt?.includes(fleetId)
          ? ("placeAt" as const)
          : options?.trailFrom?.includes(fleetId)
            ? ("trail" as const)
            : null;

        if (routeMode) {
          const placementTiles = getRoutePlacementTiles(G, playerID, currentFleet, routeMode);
          for (const [px, py] of placementTiles) {
            const key = tileKey(px, py);
            const existing = G.mapState.routeSkyships[key] ?? [];
            existing.push(playerID);
            G.mapState.routeSkyships[key] = existing;
            currentFleet.skyships -= 1;
          }
          if (placementTiles.length > 0) {
            logEvent(
              G,
              `${currentPlayer.kingdomName} leaves ${placementTiles.length} skyship(s) on the map as trade-route markers (${currentFleet.skyships} return home)`,
            );
          }
        }

        currentFleet.travelHistory = [];

        currentFleet.location = [...KINGDOM_LOCATION];

        const fleetSkyships = currentFleet.skyships;
        const fleetRegiments = currentFleet.regiments;
        const fleetLevies = currentFleet.levies;
        const fleetElite = currentFleet.eliteRegiments;

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
      retLog.info({ playerID, flags }, "ALL PASSED → endPhase");
      events.endPhase();
    } else {
      retLog.info({ playerID, flags }, "not all → endTurn");
      events.endTurn();
    }
  },
  errorMessage: "Cannot retrieve fleets right now",
};

export default retrieveFleets;
