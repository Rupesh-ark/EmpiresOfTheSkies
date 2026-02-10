import { Move } from "boardgame.io";
import { MyGameState } from "../types";

// FIX: Removed broken imports (Ctx, EventsAPI, RandomAPI)
// The Move type handles all the typing for you automatically.

const setTurnCompleteFalse: Move<MyGameState> = (
  {
    G,
    playerID,
  },
  ...args: any[]
) => {
  // Simple check to ensure player exists
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].turnComplete = false;
  }
};

export default setTurnCompleteFalse;