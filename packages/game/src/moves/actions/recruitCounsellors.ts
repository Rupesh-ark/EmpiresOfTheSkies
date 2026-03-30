import { MyGameState } from "../../types";
import { Move } from "boardgame.io";
import { validateMove } from "../moveValidation";
import { addOneCounsellor, removeGoldAmount } from "../../helpers/stateUtils";
import { INVALID_MOVE } from "boardgame.io/core";
import { CounsellorSlot, MAX_COUNSELLORS } from "../../codifiedGameInfo";

export const recruitCounsellors: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  if (validateMove(playerID, G, { costsCounsellor: true, costsGold: true })) return INVALID_MOVE;

  const value: keyof typeof G.boardState.recruitCounsellors = args[0] + 1;
  if (G.boardState.recruitCounsellors[value] !== undefined) {
    console.log("Player selected a move which has already been taken");
    return INVALID_MOVE;
  }
  const costs = {
    [CounsellorSlot.First]:  1,
    [CounsellorSlot.Second]: 1,
    [CounsellorSlot.Third]:  2,
  };
  if (G.playerInfo[playerID].resources.counsellors >= MAX_COUNSELLORS) {
    return INVALID_MOVE;
  }

  addOneCounsellor(G, playerID);
  G.boardState.recruitCounsellors[value] = playerID;
  removeGoldAmount(G, playerID, costs[value]);
  G.playerInfo[playerID].turnComplete = true;
};

export default recruitCounsellors;
