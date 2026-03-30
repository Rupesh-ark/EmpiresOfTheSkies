import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState } from "../../types";
import { logEvent } from "../../helpers/stateUtils";
import { executeInfidelFleetCombat } from "../../helpers/resolveInfidelFleet";
import { continueResolution } from "../../helpers/resolutionFlow";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { Ctx } from "boardgame.io/dist/types/src/types";

/**
 * Move called by the targeted player to fight or evade the Infidel Fleet.
 */
const respondToInfidelFleet: Move<MyGameState> = (
  { G, ctx, playerID, events, random }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
    random: any;
  },
  response: "fight" | "evade",
  fowCardIndex?: number
) => {
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
};

export default respondToInfidelFleet;
