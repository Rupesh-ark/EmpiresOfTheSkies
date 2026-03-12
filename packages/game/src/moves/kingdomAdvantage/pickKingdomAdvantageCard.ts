import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState, KingdomAdvantageCard } from "../../types";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";

const pickKingdomAdvantageCard: Move<MyGameState> = (
  {
    G,
    playerID,
    events,
  }: {
    G: MyGameState;
    playerID: string;
    events: EventsAPI;
  },
  cardName: KingdomAdvantageCard
) => {
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
    G.playerInfo[playerID].resources.regiments -= 3;
    G.playerInfo[playerID].resources.eliteRegiments += 3;
  }

  const allPicked = Object.values(G.playerInfo).every(
    (p) => p.resources.advantageCard !== undefined
  );

  if (allPicked) {
    events.endPhase();
  } else {
    events.endTurn();
  }
};

export default pickKingdomAdvantageCard;