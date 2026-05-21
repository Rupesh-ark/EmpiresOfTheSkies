import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { validateMove } from "../moveValidation";
import { recruitCounsellor, incrementActionsTaken, removeGoldAmount } from "../../helpers/stateUtils";
import { INVALID_MOVE } from "boardgame.io/core";
import { MAX_COUNSELLORS } from "../../data/gameData";

const validateRecruitCounsellors = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  if (G.playerInfo[playerID].resources.counsellors >= MAX_COUNSELLORS) {
    return {
      code: "COUNSELLOR_CAP_REACHED",
      message: `Already at maximum Counsellors (${MAX_COUNSELLORS})`,
    };
  }

  return null;
};

const recruitCounsellors: MoveDefinition = {
  fn: ({ G, playerID }) => {
    if (validateRecruitCounsellors(G, playerID)) return INVALID_MOVE;

    const cost = 1 + G.boardState.recruitCounsellors.length;

    incrementActionsTaken(G, playerID);
    recruitCounsellor(G, playerID);
    G.boardState.recruitCounsellors.push(playerID);
    removeGoldAmount(G, playerID, cost);
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot recruit a Counsellor right now",
  validate: validateRecruitCounsellors,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].resources.counsellors;
    return `${k} recruits a Counsellor (now ${count})`;
  },
};

export default recruitCounsellors;
