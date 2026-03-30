import { MoveDefinition, MyGameState, MoveError } from "../../types";
import { logEvent } from "../../helpers/stateUtils";

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
  fn: ({ G, playerID }) => {
    const deal = G.pendingDeal!;
    const k = G.playerInfo[playerID].kingdomName;
    const proposer = G.playerInfo[deal.proposerID].kingdomName;
    logEvent(G, `${k} rejects deal from ${proposer}`);
    G.pendingDeal = undefined;
  },
  errorMessage: "Cannot reject this deal",
  validate: validateRejectDeal,
};

export default rejectDeal;
