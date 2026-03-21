import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addRegiments,
  removeGoldAmount,
  removeOneCounsellor,
} from "../../helpers/stateUtils";
import { RECRUIT_REGIMENTS_REWARD } from "../../data/gameData";

const validateRecruitRegiments = (
  G: MyGameState,
  playerID: string,
  slotIndex: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.recruitRegiments = (slotIndex + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6;

  if (G.boardState.recruitRegiments[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Regiment recruitment slot is already taken" };
  }

  return null;
};

const recruitRegiments: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const value: keyof typeof G.boardState.recruitRegiments = args[0] + 1;
    if (validateRecruitRegiments(G, playerID, args[0])) return INVALID_MOVE;
    // v4.2: cost = 1 Gold + 1 Gold per counsellor in slot (including this one)
    // Slot position equals the count of counsellors, so cost = 1 + slot position
    const cost = 1 + value;
    removeOneCounsellor(G, playerID);
    removeGoldAmount(G, playerID, cost);
    // v4.2: always 4 regiments per action
    addRegiments(G, playerID, RECRUIT_REGIMENTS_REWARD);
    G.boardState.recruitRegiments[value] = playerID;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot recruit Regiments right now",
  validate: validateRecruitRegiments,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].resources.regiments;
    return `${k} recruits Regiments (now ${count})`;
  },
};

export default recruitRegiments;
