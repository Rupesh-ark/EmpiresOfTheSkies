import { Move } from "boardgame.io";
// FIX: Import Ctx from the main package (even if unused here, good practice if you need it later)
import { Ctx } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

// FIX: Removed broken imports (EventsAPI, RandomAPI)

const passFleetInfoToPlayerInfo: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  // Safety check
  if (!G.playerInfo[playerID]) {
    return INVALID_MOVE;
  }

  const fleetId = args[0];
  const skyshipCount = args[1];
  const regimentCount = args[2];
  const levyCount = args[3];

  // Verify fleet exists before accessing properties
  if (!G.playerInfo[playerID].fleetInfo[fleetId]) {
      console.log("Fleet not found");
      return INVALID_MOVE;
  }

  if (fleetId !== G.playerInfo[playerID].fleetInfo[fleetId].fleetId) {
    console.log("Fleet IDs do not match, something has gone wrong...");
    return INVALID_MOVE;
  }

  const currentPlayer = G.playerInfo[playerID];
  const currentFleet = currentPlayer.fleetInfo[fleetId];
  
  // Logic: Only allow update if fleet is at base (4,0)?
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
    
    // Explicitly marking turn as complete?
    G.playerInfo[playerID].turnComplete = true;
  }
};

export default passFleetInfoToPlayerInfo;