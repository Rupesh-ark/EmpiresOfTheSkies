import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types";
import { logEvent } from "../../helpers/stateUtils";

const nominateCaptainGeneral: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const nomineeID: string = args[0];

    if (!G.currentInvasion) return INVALID_MOVE;
    if (G.currentInvasion.phase !== "nominate") return INVALID_MOVE;

    // Only the Archprelate can nominate
    if (!G.playerInfo[playerID].isArchprelate) return INVALID_MOVE;

    // Nominee must be a valid player
    if (!G.playerInfo[nomineeID]) return INVALID_MOVE;

    // Must be Orthodox if any Orthodox player exists
    const hasOrthodox = ctx.playOrder.some(
      (id) => G.playerInfo[id].hereticOrOrthodox === "orthodox"
    );
    if (hasOrthodox && G.playerInfo[nomineeID].hereticOrOrthodox !== "orthodox") {
      return INVALID_MOVE;
    }

    // Clear previous Captain-General and set new one
    for (const id of ctx.playOrder) {
      G.playerInfo[id].isCaptainGeneral = false;
    }
    G.playerInfo[nomineeID].isCaptainGeneral = true;
    G.currentInvasion.phase = "contribute";
    G.stage = "invasion_contribute";

    logEvent(
      G,
      `Captain-General nominated: ${G.playerInfo[nomineeID].kingdomName}`
    );

    // First player in IPO contributes troops
    events.endTurn({ next: ctx.playOrder[0] });
  },
  errorMessage: "Cannot nominate a Captain-General right now",
};

export default nominateCaptainGeneral;
