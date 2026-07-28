import { INVALID_MOVE } from "boardgame.io/core";
import type { MoveDefinition } from "../../types.js";
import {
  refuseDefenderSupport,
  resolveRebellionWithTroopsAndRivals,
} from "../../helpers/resolveRebellion.js";
import { nextAfterRebellion } from "../../helpers/resolutionFlow.js";
import { logEvent } from "../../helpers/stateUtils.js";

const acceptRebellionSupport: MoveDefinition = {
  fn: ({ G, playerID, events, random }, ...args) => {
    const accept = args[0];
    const rebellion = G.currentRebellion;
    if (
      !rebellion ||
      G.step !== "rebellion_accept_support" ||
      rebellion.event.targetPlayerID !== playerID ||
      typeof accept !== "boolean"
    ) {
      return INVALID_MOVE;
    }

    rebellion.defenderSupportAccepted = accept;
    if (!accept) {
      refuseDefenderSupport(G, rebellion);
    }
    logEvent(
      G,
      `${G.playerInfo[playerID].kingdomName} ${accept ? "accepts" : "refuses"} rival help`
    );

    if (rebellion.event.card === "colonial_rebellion") {
      G.step = "deferred_battle";
      events.endTurn({ next: playerID });
      return;
    }

    resolveRebellionWithTroopsAndRivals(
      G,
      rebellion,
      random.Shuffle
    );
    G.currentRebellion = null;
    nextAfterRebellion(G, events);
  },
  errorMessage: "Cannot respond to rebellion support right now",
};

export default acceptRebellionSupport;
