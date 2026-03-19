import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types";
import { logEvent } from "../../helpers/stateUtils";
import { executeInfidelFleetCombat } from "../../helpers/resolveInfidelFleet";
import { continueResolution } from "../../helpers/resolutionFlow";

const respondToInfidelFleet: MoveDefinition = {
  fn: ({ G, playerID, events, random }, ...args) => {
    const response: "fight" | "evade" = args[0];
    const fowCardIndex: number | undefined = args[1];

    const combat = G.infidelFleetCombat;
    if (!combat) return INVALID_MOVE;
    if (combat.targetPlayerID !== playerID) return INVALID_MOVE;

    const kingdom = G.playerInfo[playerID].kingdomName;
    const player = G.playerInfo[playerID];

    if (response === "evade") {
      logEvent(G, `${kingdom}'s fleet evades the Infidel Fleet`);
      G.infidelFleetCombat = null;
    } else {
      // Pull FoW card from hand if provided
      let fowCard: { sword: number; shield: number } | undefined;
      if (
        fowCardIndex !== undefined &&
        fowCardIndex >= 0 &&
        fowCardIndex < player.resources.fortuneCards.length
      ) {
        const card = player.resources.fortuneCards.splice(fowCardIndex, 1)[0];
        fowCard = { sword: card.sword, shield: card.shield };
        logEvent(G, `${kingdom} plays Fortune of War card: ${card.sword}S/${card.shield}Sh`);
      }
      executeInfidelFleetCombat(G, random.Shuffle, fowCard);
    }

    // Continue Resolution flow (deferred events → rebellions → invasion → retrieve)
    continueResolution(G, events);
  },
  errorMessage: "Cannot respond to the Infidel Fleet right now",
};

export default respondToInfidelFleet;
