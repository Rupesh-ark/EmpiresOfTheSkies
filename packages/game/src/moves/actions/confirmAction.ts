import { MoveDefinition, MyGameState, MoveError } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

const validateConfirmAction = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  if (!G.playerInfo[playerID].turnComplete) {
    return { code: "NO_ACTION", message: "You haven't taken an action yet" };
  }
  return null;
};

const confirmAction: MoveDefinition = {
  fn: ({ G, playerID, events }) => {
    if (validateConfirmAction(G, playerID)) return INVALID_MOVE;
    events.endTurn();
  },
  errorMessage: "Cannot confirm action right now",
  validate: validateConfirmAction,
};

export default confirmAction;
