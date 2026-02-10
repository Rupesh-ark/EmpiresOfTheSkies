import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeOneCounsellor } from "../resourceUpdates";

// FIX: Removed broken imports (EventsAPI, RandomAPI, Ctx)
// FIX: Removed unused arguments (ctx, events, random) from the signature

const enableDispatchButtons: Move<MyGameState> = (
  {
    G,
    playerID,
  },
  ...args: any[]
) => {
  // Safety check for player existence
  if (!G.playerInfo[playerID]) {
    return INVALID_MOVE;
  }

  if (
    G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet
  ) {
    console.log(
      "Player has attempted to dispatch skyship fleet twice in once phase of play"
    );
    return INVALID_MOVE;
  }
  // Currently, it only validates that it hasn't happened yet.
};

export default enableDispatchButtons;