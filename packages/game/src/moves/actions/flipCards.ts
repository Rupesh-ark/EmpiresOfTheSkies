import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

const flipCards: Move<MyGameState> = ({ G, playerID }) => {
  G.playerInfo[playerID].resources.fortuneCards.forEach((card) => {
    card.flipped = true;
  });
};

export default flipCards;