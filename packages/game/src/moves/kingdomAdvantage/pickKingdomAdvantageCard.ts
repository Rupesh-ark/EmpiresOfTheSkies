import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition, KingdomAdvantageCard } from "../../types";
import { ELITE_REGIMENTS_COUNT, LEGACY_CARDS } from "../../data/gameData";
import { setStage } from "../../helpers/stageUtils";
import { seedLegacyDeal } from "../../helpers/manufacturedFunSeed";
import { logEvent } from "../../helpers/stateUtils";

const pickKingdomAdvantageCard: MoveDefinition = {
  fn: ({ G, playerID, events, random }, ...args) => {
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
      // Transition to legacy card sub-stage within the same setup phase
      const { hands, remainder, log: legacyLog } = seedLegacyDeal(
        LEGACY_CARDS,
        Object.keys(G.playerInfo),
        Object.fromEntries(
          Object.keys(G.playerInfo).map((id) => [id, G.playerInfo[id].resources.advantageCard]),
        ),
        random.Shuffle,
      );
      for (const id of Object.keys(G.playerInfo)) {
        G.playerInfo[id].legacyCardOptions = hands[id];
      }
      G.cardDecks.legacyDeck = remainder;
      for (const msg of legacyLog) logEvent(G, msg);
      setStage(G, "setup", "legacy_card");
      // Reset passed flags for legacy picking
      Object.values(G.playerInfo).forEach((p: any) => { p.passed = false; });
      events.endTurn({ next: Object.keys(G.playerInfo)[0] });
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
