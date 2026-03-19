import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeOneCounsellor } from "../../helpers/stateUtils";

const validateTrainTroops = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true });
  if (base) return base;

  if (G.playerInfo[playerID].playerBoardCounsellorLocations.trainTroops) {
    return { code: "ALREADY_TRAINED", message: "Troops have already been trained this round" };
  }

  return null;
};

const trainTroops: MoveDefinition = {
  fn: ({ G, playerID }) => {
    if (validateTrainTroops(G, playerID)) return INVALID_MOVE;
    const playerBoard = G.playerInfo[playerID].playerBoardCounsellorLocations;
    removeOneCounsellor(G, playerID);
    playerBoard.trainTroops = true;
    G.stage = "confirm_fow_draw";
  },
  errorMessage: "Cannot train troops right now",
  validate: validateTrainTroops,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} trains troops (draws 2 FoW cards)`;
  },
};

export default trainTroops;
