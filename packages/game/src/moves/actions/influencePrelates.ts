import { MyGameState, MoveError, MoveDefinition } from "../../types.js";
import { validateMove } from "../moveValidation.js";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addGoldAmount,
  removeGoldAmount,
  incrementActionsTaken,
} from "../../helpers/stateUtils.js";
import { getInfluencePrelateCost } from "../../helpers/actionCosts.js";

const validateInfluencePrelates = (
  G: MyGameState,
  playerID: string,
  slotIndex: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.influencePrelates = (slotIndex + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

  if (G.boardState.influencePrelates[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Prelate slot is already taken" };
  }

  return null;
};

const influencePrelates: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const value: keyof typeof G.boardState.influencePrelates = args[0] + 1;

    if (validateInfluencePrelates(G, playerID, args[0])) return INVALID_MOVE;

    const { cost, recipientID } = getInfluencePrelateCost(G, playerID, value);
    if (recipientID) {
      addGoldAmount(G, recipientID, cost);
    }
    removeGoldAmount(G, playerID, cost);

    incrementActionsTaken(G, playerID);

    G.boardState.influencePrelates[value] = playerID;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot influence Prelates right now",
  validate: validateInfluencePrelates,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} influences Prelates`;
  },
};

export default influencePrelates;
