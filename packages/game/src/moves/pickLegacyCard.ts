import { MoveDefinition } from "../types";
import { allPlayersPassed } from "../helpers/stateUtils";

const pickLegacyCard: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args: any[]) => {
    const card = args[0];

    G.playerInfo[playerID].resources.legacyCard = card;
    G.playerInfo[playerID].passed = true;

    if (allPlayersPassed(G)) {
      events.endPhase();
    } else {
      events.endTurn();
    }
  },
  errorMessage: "Cannot pick a legacy card right now",
};

export default pickLegacyCard;
