import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { KINGDOM_LOCATION } from "../../codifiedGameInfo";

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

  if (atHome) {
    if (currentPlayer.resources.skyships < skyshipCount) {
      return {
        code: "INSUFFICIENT_SKYSHIPS",
        message: `Not enough Skyships — need ${skyshipCount}, have ${currentPlayer.resources.skyships}`,
      };
    }
    if (currentPlayer.resources.regiments < regimentCount) {
      return {
        code: "INSUFFICIENT_REGIMENTS",
        message: `Not enough Regiments — need ${regimentCount}, have ${currentPlayer.resources.regiments}`,
      };
    }
    if (currentPlayer.resources.levies < levyCount) {
      return {
        code: "INSUFFICIENT_LEVIES",
        message: `Not enough Levies — need ${levyCount}, have ${currentPlayer.resources.levies}`,
      };
    }
    if (currentPlayer.resources.eliteRegiments < eliteRegimentCount) {
      return {
        code: "INSUFFICIENT_ELITE_REGIMENTS",
        message: `Not enough Elite Regiments — need ${eliteRegimentCount}, have ${currentPlayer.resources.eliteRegiments}`,
      };
    }
    if (skyshipCount < regimentCount + levyCount + eliteRegimentCount) {
      return {
        code: "TROOP_CAPACITY_EXCEEDED",
        message: "Cannot carry more troops than Skyships (1 troop per Skyship)",
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

    if (validatePassFleetInfo(G, playerID, fleetId, skyshipCount, regimentCount, levyCount, eliteRegimentCount)) return INVALID_MOVE;

    const currentPlayer = G.playerInfo[playerID];
    const currentFleet = currentPlayer.fleetInfo[fleetId];
    if (currentFleet.location[0] === KINGDOM_LOCATION[0] && currentFleet.location[1] === KINGDOM_LOCATION[1]) {
      currentFleet.skyships = skyshipCount;
      currentFleet.regiments = regimentCount;
      currentFleet.levies = levyCount;
      currentFleet.eliteRegiments = eliteRegimentCount;

      currentPlayer.resources.skyships -= skyshipCount;
      currentPlayer.resources.regiments -= regimentCount;
      currentPlayer.resources.levies -= levyCount;
      currentPlayer.resources.eliteRegiments -= eliteRegimentCount;
      // v4.2: Kingdom↔Fleet transfers are a free Anytime action — do NOT set turnComplete
    }
  },
  errorMessage: "Cannot transfer resources to fleet",
  validate: validatePassFleetInfo,
};

export default passFleetInfoToPlayerInfo;
