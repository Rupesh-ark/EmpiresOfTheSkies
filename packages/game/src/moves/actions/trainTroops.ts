import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { removeOneCounsellor } from "../../helpers/stateUtils";
import { FOW_CARDS_DRAWN, FOW_HAND_MAX } from "../../codifiedGameInfo";

const trainTroops: Move<MyGameState> = ({ G, playerID }) => {
  if (validateMove(playerID, G, { costsCounsellor: true })) return INVALID_MOVE;
  const playerBoard = G.playerInfo[playerID].playerBoardCounsellorLocations;

  if (playerBoard.trainTroops) {
    return INVALID_MOVE;
  }
  for (let i = 0; i < FOW_CARDS_DRAWN; i++) {
    const card = drawFortuneOfWarCard(G);
    G.playerInfo[playerID].resources.fortuneCards.push({
      ...card,
      flipped: false,
    });
  }
  // GAP-13: FoW hand max 4 — discard oldest cards if over the limit
  const hand = G.playerInfo[playerID].resources.fortuneCards;
  if (hand.length > FOW_HAND_MAX) {
    hand.splice(0, hand.length - FOW_HAND_MAX);
  }
  removeOneCounsellor(G, playerID);
  playerBoard.trainTroops = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default trainTroops;
