import { PlayerOrder, MyGameState, MoveError, MoveDefinition } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeOneCounsellor } from "../../helpers/stateUtils";

export const validateAlterPlayerOrder = (
  G: MyGameState,
  playerID: string,
  newPosition: number,
  numPlayers: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true });
  if (base) return base;

  const slot: keyof PlayerOrder = (newPosition + 1) as keyof PlayerOrder;

  if (numPlayers < slot) {
    return { code: "POSITION_OUT_OF_RANGE", message: "That player order position does not exist in this game" };
  }

  if (G.boardState.pendingPlayerOrder[slot] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That player order position is already taken" };
  }

  const alreadyPlaced = Object.values(G.boardState.pendingPlayerOrder).some(
    (id) => id === playerID
  );
  if (alreadyPlaced) {
    return { code: "ALREADY_PLACED", message: "Your Kingdom has already chosen a player order position" };
  }

  return null;
};

const alterPlayerOrder: MoveDefinition = {
  fn: ({ G, ctx }, ...args: any[]) => {
    const newPosition: keyof PlayerOrder = args[0] + 1;
    const playerID = ctx.currentPlayer;
    if (validateMove(playerID, G, { costsCounsellor: true })) return INVALID_MOVE;
    if (ctx.numPlayers < newPosition) {
      return INVALID_MOVE;
    }
    if (G.boardState.pendingPlayerOrder[newPosition] !== undefined) {
      return INVALID_MOVE;
    }
    for (const value of Object.values(G.boardState.pendingPlayerOrder)) {
      if (value === playerID) {
        return INVALID_MOVE;
      }
    }
    removeOneCounsellor(G, playerID);
    G.boardState.pendingPlayerOrder[newPosition] = playerID;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot change player order right now",
  validate: (G, playerID, newPosition) => validateAlterPlayerOrder(G, playerID, newPosition, Object.keys(G.playerInfo).length),
  successLog: (G, pid, newPosition) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} changes to player order position ${newPosition + 1}`;
  },
};

export default alterPlayerOrder;
