import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
const enableDispatchButtons: Move<MyGameState> = (
  { G, playerID },
) => {
  if (
    G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet
  ) {
    return INVALID_MOVE;
  }
};

export default enableDispatchButtons;
