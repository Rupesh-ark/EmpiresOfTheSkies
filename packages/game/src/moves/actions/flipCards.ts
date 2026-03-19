import { MoveDefinition } from "../../types";

const flipCards: MoveDefinition = {
  fn: ({ G, playerID }) => {
    G.playerInfo[playerID].resources.fortuneCards.forEach((card) => {
      card.flipped = true;
    });
  },
  errorMessage: "Cannot flip cards right now",
};

export default flipCards;
