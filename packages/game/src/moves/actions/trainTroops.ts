import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { removeOneCounsellor } from "../../helpers/stateUtils";
import { FOW_CARDS_DRAWN, FOW_HAND_MAX } from "../../codifiedGameInfo";

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
  fn: ({ G, playerID, random }) => {
    if (validateTrainTroops(G, playerID)) return INVALID_MOVE;
    const playerBoard = G.playerInfo[playerID].playerBoardCounsellorLocations;
    for (let i = 0; i < FOW_CARDS_DRAWN; i++) {
      const card = drawFortuneOfWarCard(G, random.Shuffle);
      G.playerInfo[playerID].resources.fortuneCards.push({
        ...card,
        flipped: true,
      });
    }
    removeOneCounsellor(G, playerID);
    playerBoard.trainTroops = true;
    const hand = G.playerInfo[playerID].resources.fortuneCards;
    if (hand.length > FOW_HAND_MAX) {
      G.stage = "discard_fow";
    } else {
      G.playerInfo[playerID].turnComplete = true;
    }
  },
  errorMessage: "Cannot train troops right now",
  validate: validateTrainTroops,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} trains troops (draws 2 FoW cards)`;
  },
};

export default trainTroops;
