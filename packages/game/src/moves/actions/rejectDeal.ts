import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

const rejectDeal: Move<MyGameState> = ({ G, playerID }) => {
  if (!G.pendingDeal) {
    return INVALID_MOVE;
  }

  if (G.pendingDeal.targetID !== playerID) {
    return INVALID_MOVE;
  }

  G.pendingDeal = undefined;
};

export default rejectDeal;
