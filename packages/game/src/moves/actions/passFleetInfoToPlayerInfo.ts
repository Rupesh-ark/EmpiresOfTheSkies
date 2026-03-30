import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { KINGDOM_LOCATION } from "../../data/gameData";

function sanitizeFleetValue(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || isNaN(val)) {
    console.warn(`[passFleetInfoToPlayerInfo] Invalid fleet value: ${val}, defaulting to ${fallback}`);
    return fallback;
  }
  return val;
}

const validatePassFleetInfo = (
  G: MyGameState,
  playerID: string,
  fleetId: number,
  skyshipCount: number,
  regimentCount: number,
  levyCount: number,
  eliteRegimentCount: number
): MoveError | null => {
  const currentPlayer = G.playerInfo[playerID];
  const currentFleet = currentPlayer.fleetInfo[fleetId];

  if (!currentFleet || fleetId !== currentFleet.fleetId) {
    return { code: "INVALID_FLEET", message: "No fleet found with that ID" };
  }

  const atHome =
    currentFleet.location[0] === KINGDOM_LOCATION[0] &&
    currentFleet.location[1] === KINGDOM_LOCATION[1];

  if (skyshipCount < 0 || regimentCount < 0 || levyCount < 0 || eliteRegimentCount < 0) {
    return { code: "NEGATIVE_VALUE", message: "Fleet values cannot be negative" };
  }

  if (skyshipCount < regimentCount + levyCount + eliteRegimentCount) {
    return {
      code: "TROOP_CAPACITY_EXCEEDED",
      message: "Cannot carry more troops than Skyships (1 troop per Skyship)",
    };
  }

  if (atHome) {
    const fleetSkyships = sanitizeFleetValue(currentFleet.skyships);
    const fleetRegiments = sanitizeFleetValue(currentFleet.regiments);
    const fleetLevies = sanitizeFleetValue(currentFleet.levies);
    const fleetElite = sanitizeFleetValue(currentFleet.eliteRegiments);

    const deltaSkyships = skyshipCount - fleetSkyships;
    const deltaRegiments = regimentCount - fleetRegiments;
    const deltaLevies = levyCount - fleetLevies;
    const deltaElite = eliteRegimentCount - fleetElite;

    if (deltaSkyships > 0 && currentPlayer.resources.skyships < deltaSkyships) {
      return {
        code: "INSUFFICIENT_SKYSHIPS",
        message: `Not enough Skyships — need ${deltaSkyships} more, have ${currentPlayer.resources.skyships}`,
      };
    }
    if (deltaRegiments > 0 && currentPlayer.resources.regiments < deltaRegiments) {
      return {
        code: "INSUFFICIENT_REGIMENTS",
        message: `Not enough Regiments — need ${deltaRegiments} more, have ${currentPlayer.resources.regiments}`,
      };
    }
    if (deltaLevies > 0 && currentPlayer.resources.levies < deltaLevies) {
      return {
        code: "INSUFFICIENT_LEVIES",
        message: `Not enough Levies — need ${deltaLevies} more, have ${currentPlayer.resources.levies}`,
      };
    }
    if (deltaElite > 0 && currentPlayer.resources.eliteRegiments < deltaElite) {
      return {
        code: "INSUFFICIENT_ELITE_REGIMENTS",
        message: `Not enough Elite Regiments — need ${deltaElite} more, have ${currentPlayer.resources.eliteRegiments}`,
      };
    }
  }

  return null;
};

const passFleetInfoToPlayerInfo: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const fleetId = args[0];
    const skyshipCount = args[1];
    const regimentCount = args[2];
    const levyCount = args[3];
    const eliteRegimentCount = args[4] ?? 0;  // backwards compatible — older callers omit this

    // Defensive: validate args are valid numbers
    if (typeof levyCount !== 'number' || isNaN(levyCount)) {
      console.warn(`[passFleetInfoToPlayerInfo] Invalid levyCount arg: ${levyCount}`);
      return INVALID_MOVE;
    }
    if (typeof skyshipCount !== 'number' || isNaN(skyshipCount) ||
        typeof regimentCount !== 'number' || isNaN(regimentCount)) {
      console.warn(`[passFleetInfoToPlayerInfo] Invalid troop counts: sky=${skyshipCount} reg=${regimentCount}`);
      return INVALID_MOVE;
    }

    if (validatePassFleetInfo(G, playerID, fleetId, skyshipCount, regimentCount, levyCount, eliteRegimentCount)) return INVALID_MOVE;

    const currentPlayer = G.playerInfo[playerID];
    const currentFleet = currentPlayer.fleetInfo[fleetId];
    if (currentFleet.location[0] === KINGDOM_LOCATION[0] && currentFleet.location[1] === KINGDOM_LOCATION[1]) {
      // Sanitize fleet values to prevent NaN in delta calculations
      const fleetSkyships = sanitizeFleetValue(currentFleet.skyships);
      const fleetRegiments = sanitizeFleetValue(currentFleet.regiments);
      const fleetLevies = sanitizeFleetValue(currentFleet.levies);
      const fleetElite = sanitizeFleetValue(currentFleet.eliteRegiments);

      const deltaSkyships = skyshipCount - fleetSkyships;
      const deltaRegiments = regimentCount - fleetRegiments;
      const deltaLevies = levyCount - fleetLevies;
      const deltaElite = eliteRegimentCount - fleetElite;

      currentFleet.skyships = skyshipCount;
      currentFleet.regiments = regimentCount;
      currentFleet.levies = levyCount;
      currentFleet.eliteRegiments = eliteRegimentCount;

      currentPlayer.resources.skyships -= deltaSkyships;
      currentPlayer.resources.regiments -= deltaRegiments;
      currentPlayer.resources.levies -= deltaLevies;
      currentPlayer.resources.eliteRegiments -= deltaElite;
      // v4.2: Kingdom↔Fleet transfers are a free Anytime action — do NOT set turnComplete
    }
  },
  errorMessage: "Cannot transfer resources to fleet",
  validate: validatePassFleetInfo,
};

export default passFleetInfoToPlayerInfo;
