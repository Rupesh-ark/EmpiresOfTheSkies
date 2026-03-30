import { MoveDefinition, MyGameState, MoveError } from "../../types";

const validateRejectDeal = (G: MyGameState, playerID: string): MoveError | null => {
  if (!G.pendingDeal) {
    return { code: "NO_DEAL", message: "No deal pending" };
  }
  if (G.pendingDeal.targetID !== playerID) {
    return { code: "NOT_TARGET", message: "This deal is not for you" };
  }
  return null;
};

const rejectDeal: MoveDefinition = {
  fn: ({ G }) => {
    G.pendingDeal = undefined;
  },
  errorMessage: "Cannot reject this deal",
  validate: validateRejectDeal,
};

export default rejectDeal;
