import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { FOW_HAND_MAX } from "../../codifiedGameInfo";

const discardFoWCard: Move<MyGameState> = ({ G, playerID }, ...args: any[]) => {
  const cardIndex: number = args[0];
  const hand = G.playerInfo[playerID].resources.fortuneCards;

  if (cardIndex < 0 || cardIndex >= hand.length) {
    return INVALID_MOVE;
  }

  hand.splice(cardIndex, 1);

  if (hand.length <= FOW_HAND_MAX) {
    G.stage = "actions";
    G.playerInfo[playerID].turnComplete = true;
  }
};

export default discardFoWCard;
