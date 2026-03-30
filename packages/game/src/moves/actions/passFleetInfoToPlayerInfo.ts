import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validatePassFleetInfo } from "../moveValidation";
import { KINGDOM_LOCATION } from "../../codifiedGameInfo";
const passFleetInfoToPlayerInfo: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
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
};

export default passFleetInfoToPlayerInfo;
