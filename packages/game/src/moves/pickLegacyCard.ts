import { INVALID_MOVE } from "boardgame.io/core";
import { LegacyCardInfo, MoveDefinition, MoveError, MyGameState } from "../types.js";
import { allPlayersPassed } from "../helpers/stateUtils.js";

const validatePickLegacyCard = (
  G: MyGameState,
  playerID: string,
  card: unknown
): MoveError | null => {
  if (G.playerInfo[playerID].resources.legacyCard !== undefined) {
    return { code: "ALREADY_HAS_CARD", message: "You already have a Legacy card" };
  }
  if (
    typeof card !== "object" ||
    card === null ||
    !("name" in card) ||
    !("colour" in card) ||
    !G.playerInfo[playerID].legacyCardOptions.some(
      (option) => option.name === card.name && option.colour === card.colour
    )
  ) {
    return { code: "CARD_UNAVAILABLE", message: "That Legacy card was not dealt to you" };
  }
  return null;
};

const pickLegacyCard: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args: any[]) => {
    const card = args[0] as LegacyCardInfo;
    if (validatePickLegacyCard(G, playerID, card)) return INVALID_MOVE;

    G.playerInfo[playerID].resources.legacyCard = card;
    G.playerInfo[playerID].passed = true;

    if (allPlayersPassed(G)) {
      events.endPhase();
    } else {
      events.endTurn();
    }
  },
  errorMessage: "Cannot pick a legacy card right now",
  validate: validatePickLegacyCard,
};

export default pickLegacyCard;
