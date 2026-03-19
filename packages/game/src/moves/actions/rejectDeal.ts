import { MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

const rejectDeal: MoveDefinition = {
  fn: ({ G, playerID }) => {
    if (!G.pendingDeal) {
      return INVALID_MOVE;
    }

    if (G.pendingDeal.targetID !== playerID) {
      return INVALID_MOVE;
    }

    G.pendingDeal = undefined;
  },
  errorMessage: "Cannot reject this deal",
};

export default rejectDeal;
