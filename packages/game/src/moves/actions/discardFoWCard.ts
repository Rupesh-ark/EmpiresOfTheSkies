import { MoveDefinition, MyGameState, MoveError } from "../../types";
import { FOW_HAND_MAX } from "../../codifiedGameInfo";

const validateDiscardFoWCard = (G: MyGameState, playerID: string, cardIndex: number): MoveError | null => {
  const hand = G.playerInfo[playerID].resources.fortuneCards;
  if (cardIndex < 0 || cardIndex >= hand.length) {
    return { code: "INVALID_CARD_INDEX", message: "Invalid card selection" };
  }
  return null;
};

const discardFoWCard: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const cardIndex: number = args[0];
    const hand = G.playerInfo[playerID].resources.fortuneCards;

    hand.splice(cardIndex, 1);

    if (hand.length <= FOW_HAND_MAX) {
      G.stage = "actions";
      G.playerInfo[playerID].turnComplete = true;
    }
  },
  errorMessage: "Cannot discard this card",
  validate: validateDiscardFoWCard,
};

export default discardFoWCard;
