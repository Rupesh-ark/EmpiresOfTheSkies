import { MyGameState } from "../../types";
import { Move } from "boardgame.io";
import { validateRecruitCounsellors } from "../moveValidation";
import { addOneCounsellor, removeGoldAmount } from "../../helpers/stateUtils";
import { INVALID_MOVE } from "boardgame.io/core";
import { CounsellorSlot } from "../../codifiedGameInfo";

export const recruitCounsellors: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  const value: keyof typeof G.boardState.recruitCounsellors = args[0] + 1;
  if (validateRecruitCounsellors(G, playerID, args[0])) return INVALID_MOVE;

  const costs = {
    [CounsellorSlot.First]:  1,
    [CounsellorSlot.Second]: 1,
    [CounsellorSlot.Third]:  2,
  };

  addOneCounsellor(G, playerID);
  G.boardState.recruitCounsellors[value] = playerID;
  removeGoldAmount(G, playerID, costs[value]);
  G.playerInfo[playerID].turnComplete = true;
};

export default recruitCounsellors;
