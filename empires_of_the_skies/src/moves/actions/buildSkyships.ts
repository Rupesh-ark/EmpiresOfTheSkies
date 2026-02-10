import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addSkyship,
  removeGoldAmount,
  removeOneCounsellor,
} from "../resourceUpdates";

// FIX: Removed broken internal imports (Ctx, EventsAPI, RandomAPI).
// FIX: Removed unused arguments (ctx, events, random) from the signature.

const buildSkyships: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }

  // Safety check to ensure player exists
  if (!G.playerInfo[playerID]) {
    return INVALID_MOVE;
  }

  if (G.playerInfo[playerID].shipyards === 0) {
    console.log("Player tried to build skyships without having any shipyards");
    return INVALID_MOVE;
  }

  if (
    G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships === true
  ) {
    console.log(
      "Player has attempted to build skyships twice in the same phase of play"
    );
    return INVALID_MOVE;
  }

  const cost = 2 * G.playerInfo[playerID].shipyards;

  removeOneCounsellor(G, playerID);
  removeGoldAmount(G, playerID, cost);
  
  // Logic: for every gold spent (cost), you get 1 skyship? 
  // The loop runs 'cost' times, adding 1 skyship each time.
  for (let i = 0; i < cost; i++) {
    addSkyship(G, playerID);
  }
  
  G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default buildSkyships;