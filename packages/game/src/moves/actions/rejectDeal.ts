import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

const rejectDeal: Move<MyGameState> = ({ G, playerID }) => {
  if (!G.pendingDeal) {
    console.log("No deal pending");
    return INVALID_MOVE;
  }

  if (G.pendingDeal.targetID !== playerID) {
    console.log("Only the target player can reject a deal");
    return INVALID_MOVE;
  }

  G.pendingDeal = undefined;
};

export default rejectDeal;
