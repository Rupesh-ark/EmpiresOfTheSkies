import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { checkCounsellorsNotZero } from "../moveValidation";
import {
  addLevyAmount,
  removeOneCounsellor,
  removeVPAmount,
} from "../resourceUpdates";

// FIX: Removed broken internal imports (Ctx, EventsAPI, RandomAPI).
// FIX: Removed unused arguments (ctx, events, random) from the signature.

const conscriptLevies: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  // Safety check
  if (!G.playerInfo[playerID]) {
    return INVALID_MOVE;
  }

  if (G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies) {
    console.log(
      "Player has attempted to conscript levies twice in the same phase of play"
    );
    return INVALID_MOVE;
  }

  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }

  const levyAmount: number = args[0];

  if (levyAmount === 0) {
    console.log("Player has attempted to conscript 0 levies");
    return INVALID_MOVE;
  }

  // Logic: Cost is 1 VP per 3 Levies?
  const cost = levyAmount / 3;

  removeOneCounsellor(G, playerID);
  removeVPAmount(G, playerID, cost);
  addLevyAmount(G, playerID, levyAmount);
  
  G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default conscriptLevies;