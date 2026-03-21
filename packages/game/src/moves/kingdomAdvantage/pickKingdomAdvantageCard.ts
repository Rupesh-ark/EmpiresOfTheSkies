import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition, KingdomAdvantageCard } from "../../types";
import { ELITE_REGIMENTS_COUNT } from "../../data/gameData";

const pickKingdomAdvantageCard: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    const cardName: KingdomAdvantageCard = args[0];

    if (!G.cardDecks.kingdomAdvantagePool.includes(cardName)) {
      return INVALID_MOVE;
    }

    if (G.playerInfo[playerID].resources.advantageCard !== undefined) {
      return INVALID_MOVE;
    }

    G.playerInfo[playerID].resources.advantageCard = cardName;
    G.cardDecks.kingdomAdvantagePool = G.cardDecks.kingdomAdvantagePool.filter(
      (c) => c !== cardName
    );

    if (cardName === "elite_regiments") {
      G.playerInfo[playerID].resources.regiments -= ELITE_REGIMENTS_COUNT;
      G.playerInfo[playerID].resources.eliteRegiments += ELITE_REGIMENTS_COUNT;
    }

    const allPicked = Object.values(G.playerInfo).every(
      (p) => p.resources.advantageCard !== undefined
    );

    if (allPicked) {
      events.endPhase();
    } else {
      events.endTurn();
    }
  },
  errorMessage: "Cannot pick this Kingdom Advantage card",
  validate: (G, playerID, cardName) => {
    if (!G.cardDecks.kingdomAdvantagePool.includes(cardName)) {
      return { code: "CARD_UNAVAILABLE", message: "That Kingdom Advantage card is not available" };
    }
    if (G.playerInfo[playerID].resources.advantageCard !== undefined) {
      return { code: "ALREADY_HAS_CARD", message: "You already have a Kingdom Advantage card" };
    }
    return null;
  },
};

export default pickKingdomAdvantageCard;
