import { MyGameState, MoveError, MoveDefinition } from "../../types.js";
import { validateMove } from "../moveValidation.js";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addRegiments,
  removeGoldAmount,
  incrementActionsTaken,
} from "../../helpers/stateUtils.js";
import { RECRUIT_REGIMENTS_REWARD } from "../../data/gameData.js";

const validateRecruitRegiments = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  return null;
};

const recruitRegiments: MoveDefinition = {
  fn: ({ G, playerID }) => {
    if (validateRecruitRegiments(G, playerID)) return INVALID_MOVE;

    const cost = 1 + G.boardState.recruitRegiments.length + 1;
    incrementActionsTaken(G, playerID);
    removeGoldAmount(G, playerID, cost);
    addRegiments(G, playerID, RECRUIT_REGIMENTS_REWARD);
    G.boardState.recruitRegiments.push(playerID);
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
