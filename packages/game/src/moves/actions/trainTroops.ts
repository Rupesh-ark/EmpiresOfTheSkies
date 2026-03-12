import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { removeOneCounsellor } from "../../helpers/stateUtils";

const trainTroops: Move<MyGameState> = ({ G, playerID }) => {
  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }
  const playerBoard = G.playerInfo[playerID].playerBoardCounsellorLocations;

  if (playerBoard.trainTroops) {
    console.log("Player has selected a move which has already been taken.");
    return INVALID_MOVE;
  }
  for (let i = 0; i < 2; i++) {
    const card = drawFortuneOfWarCard(G);
    G.playerInfo[playerID].resources.fortuneCards.push({
      ...card,
      flipped: false,
    });
  }
  removeOneCounsellor(G, playerID);
  playerBoard.trainTroops = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default trainTroops;
