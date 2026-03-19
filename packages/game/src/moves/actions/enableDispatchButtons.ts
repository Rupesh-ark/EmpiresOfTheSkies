import { MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

const enableDispatchButtons: MoveDefinition = {
  fn: ({ G, playerID }) => {
    if (
      G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet
    ) {
      return INVALID_MOVE;
    }
  },
  errorMessage: "Dispatch is not available",
};

export default enableDispatchButtons;
