import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

const passFleetInfoToPlayerInfo: Move<MyGameState> = (
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
  const fleetId = args[0];
  const skyshipCount = args[1];
  const regimentCount = args[2];
  const levyCount = args[3];

  if (fleetId !== G.playerInfo[playerID].fleetInfo[fleetId].fleetId) {
    console.log("Fleet IDs do not match, something has gone wrong...");
    return INVALID_MOVE;
  }

  const currentPlayer = G.playerInfo[playerID];
  const currentFleet = currentPlayer.fleetInfo[fleetId];
  if (currentFleet.location[0] === 4 && currentFleet.location[1] === 0) {
    if (
      currentPlayer.resources.skyships < skyshipCount ||
      currentPlayer.resources.regiments < regimentCount ||
      currentPlayer.resources.levies < levyCount
    ) {
      console.log(
        "Player has attempted to deploy more of a resource than they have ready, something has gone wrong..."
      );
      return INVALID_MOVE;
    }
    currentFleet.skyships = skyshipCount;
    currentFleet.regiments = regimentCount;
    currentFleet.levies = levyCount;

    currentPlayer.resources.skyships -= skyshipCount;
    currentPlayer.resources.regiments -= regimentCount;
    currentPlayer.resources.levies -= levyCount;
    G.playerInfo[playerID].turnComplete = true;
  }
};

export default passFleetInfoToPlayerInfo;
