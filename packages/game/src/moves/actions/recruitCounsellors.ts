import { MyGameState, MoveError } from "../../types";
import { Move } from "boardgame.io";
import { validateMove } from "../moveValidation";
import { addOneCounsellor, removeGoldAmount } from "../../helpers/stateUtils";
import { INVALID_MOVE } from "boardgame.io/core";
import { CounsellorSlot, MAX_COUNSELLORS } from "../../codifiedGameInfo";

export const validateRecruitCounsellors = (
  G: MyGameState,
  playerID: string,
  slotIndex: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.recruitCounsellors = (slotIndex + 1) as
    | typeof CounsellorSlot.First
    | typeof CounsellorSlot.Second
    | typeof CounsellorSlot.Third;

  if (G.boardState.recruitCounsellors[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Counsellor slot is already taken" };
  }

  if (G.playerInfo[playerID].resources.counsellors >= MAX_COUNSELLORS) {
    return {
      code: "COUNSELLOR_CAP_REACHED",
      message: `Already at maximum Counsellors (${MAX_COUNSELLORS})`,
    };
  }

  return null;
};

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
