import { MoveDefinition, MoveError, MyGameState, PlayerInfo } from "../../types.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { allPlayersPassed, logEvent } from "../../helpers/stateUtils.js";
import { KINGDOM_LOCATION } from "../../data/gameData.js";
import { tileKey, getRoutePlacementTiles } from "../../helpers/mapUtils.js";
import log from "../../helpers/logger.js";

const retLog = log.child({ mod: "retrieve-fleets" });

export type RetrieveOptions = {
  placeAt?: number[];
  trailFrom?: number[];
  reclaim?: [number, number][];
};

function sanitizeFleetValue(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || isNaN(val)) {
    retLog.warn({ val, fallback }, "Invalid fleet value, defaulting");
    return fallback;
  }
  return val;
}

const isAtHome = (location: number[]): boolean =>
  location[0] === KINGDOM_LOCATION[0] &&
  location[1] === KINGDOM_LOCATION[1];

const validateRetrieveFleets = (
  G: MyGameState,
  playerID: string,
  fleets: unknown,
  options?: unknown
): MoveError | null => {
  if (!Array.isArray(fleets)) {
    return { code: "INVALID_FLEETS", message: "Fleets must be supplied as an array" };
  }

  const currentPlayer = G.playerInfo[playerID];
  const seenFleetIds = new Set<number>();
  for (const fleetId of fleets) {
    if (!Number.isInteger(fleetId) || fleetId < 0) {
      return { code: "INVALID_FLEET", message: "Fleet IDs must be non-negative integer indexes" };
    }
    if (seenFleetIds.has(fleetId)) {
      return { code: "DUPLICATE_FLEET", message: "A fleet can only be retrieved once" };
    }
    seenFleetIds.add(fleetId);

    const fleet = currentPlayer.fleetInfo[fleetId];
    if (!fleet) {
      return { code: "INVALID_FLEET", message: "No fleet found at that index" };
    }
    if (isAtHome(fleet.location)) {
      return { code: "FLEET_ALREADY_HOME", message: "Only deployed fleets can be retrieved" };
    }
  }

  if (options === undefined) return null;
  if (typeof options !== "object" || options === null || Array.isArray(options)) {
    return { code: "INVALID_OPTIONS", message: "Retrieve options must be an object" };
  }

  const retrieveOptions = options as RetrieveOptions;
  for (const [key, optionFleetIds] of [
    ["placeAt", retrieveOptions.placeAt],
    ["trailFrom", retrieveOptions.trailFrom],
  ] as const) {
    if (optionFleetIds === undefined) continue;
    if (!Array.isArray(optionFleetIds)) {
      return { code: "INVALID_OPTIONS", message: `${key} must be an array of fleet IDs` };
    }
    for (const fleetId of optionFleetIds) {
      if (!Number.isInteger(fleetId) || !seenFleetIds.has(fleetId)) {
        return { code: "INVALID_ROUTE_FLEET", message: "Route options must refer to a fleet being retrieved" };
      }
    }
  }

  const placeAtIds = new Set(retrieveOptions.placeAt ?? []);
  for (const fleetId of retrieveOptions.trailFrom ?? []) {
    if (placeAtIds.has(fleetId)) {
      return { code: "CONFLICTING_ROUTE_OPTION", message: "A fleet cannot place at its location and leave a trail" };
    }
  }

  if (retrieveOptions.reclaim !== undefined) {
    if (!Array.isArray(retrieveOptions.reclaim)) {
      return { code: "INVALID_RECLAIM", message: "Reclaim tiles must be supplied as an array" };
    }
    const seenReclaimTiles = new Set<string>();
    for (const tile of retrieveOptions.reclaim) {
      if (
        !Array.isArray(tile) ||
        tile.length !== 2 ||
        !tile.every((coordinate) => Number.isInteger(coordinate))
      ) {
        return { code: "INVALID_RECLAIM_TILE", message: "Reclaim coordinates must be integer pairs" };
      }
      const key = tileKey(tile[0], tile[1]);
      if (seenReclaimTiles.has(key)) {
        return { code: "DUPLICATE_RECLAIM_TILE", message: "A route tile can only be reclaimed once" };
      }
      seenReclaimTiles.add(key);
      if (!(G.mapState.routeSkyships[key] ?? []).includes(playerID)) {
        return { code: "INVALID_RECLAIM_TILE", message: "The tile does not hold one of your route skyships" };
      }
    }
  }

  for (const fleetId of placeAtIds) {
    const fleet = currentPlayer.fleetInfo[fleetId];
    const placementTiles = getRoutePlacementTiles(G, playerID, fleet, "placeAt");
    if (
      placementTiles.length > 0 &&
      !placementTiles.some(
        ([x, y]) => x === fleet.location[0] && y === fleet.location[1]
      )
    ) {
      return { code: "INVALID_ROUTE_PLACEMENT", message: "Route placement is not allowed at that tile" };
    }
  }

  return null;
};

const retrieveFleets: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    const fleets: number[] = args[0];
    const options: RetrieveOptions | undefined = args[1];

    if (validateRetrieveFleets(G, playerID, fleets, options)) return INVALID_MOVE;

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
          const i = currentBattleMapTile.indexOf(playerID);
          if (i >= 0) {
            currentBattleMapTile.splice(i, 1);
          }
        }
      });
    }

    // Reclaims run AFTER placements: a retrieved fleet's trail must still see
    // the marker and skip its tile, or it would silently re-fill the square
    // the player just chose to vacate (and burn a fleet skyship doing it).
    const reclaimedTiles = options?.reclaim ?? [];
    for (const [x, y] of reclaimedTiles) {
      const key = tileKey(x, y);
      const routeShips = G.mapState.routeSkyships[key];
      const ownIndex = routeShips?.indexOf(playerID) ?? -1;
      if (ownIndex < 0) continue;
      routeShips.splice(ownIndex, 1);
      if (routeShips.length === 0) delete G.mapState.routeSkyships[key];
      G.playerInfo[playerID].resources.skyships += 1;
    }
    if (reclaimedTiles.length > 0) {
      logEvent(
        G,
        `${G.playerInfo[playerID].kingdomName} reclaims ${reclaimedTiles.length} route skyship(s)`,
      );
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
  validate: validateRetrieveFleets,
};

export default retrieveFleets;
