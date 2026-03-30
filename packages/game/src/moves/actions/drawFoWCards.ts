import { MoveDefinition, MyGameState, MoveError } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { FOW_CARDS_DRAWN, FOW_HAND_MAX } from "../../data/gameData";

const validateDrawFoWCards = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  if (G.stage !== "confirm_fow_draw") {
    return { code: "WRONG_STAGE", message: "Not in a card draw stage" };
  }
  return null;
};

const drawFoWCards: MoveDefinition = {
  fn: ({ G, playerID, random, events }) => {
    if (validateDrawFoWCards(G, playerID)) return INVALID_MOVE;

    for (let i = 0; i < FOW_CARDS_DRAWN; i++) {
      const card = drawFortuneOfWarCard(G, random.Shuffle);
      G.playerInfo[playerID].resources.fortuneCards.push({
        ...card,
        flipped: true,
      });
    }

    const hand = G.playerInfo[playerID].resources.fortuneCards;
    if (hand.length > FOW_HAND_MAX) {
      G.stage = "discard_fow";
    } else {
      G.stage = "actions";
      events.endTurn();
    }
  },
  errorMessage: "Cannot draw cards right now",
  validate: validateDrawFoWCards,
};

export default drawFoWCards;
