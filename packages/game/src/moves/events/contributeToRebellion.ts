import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState } from "../../types";
import { logEvent } from "../../helpers/stateUtils";
import {
  resolveRebellionWithTroopsAndRivals,
  setupNextRebellion,
} from "../../helpers/resolveRebellion";
import { continueResolution } from "../../helpers/resolutionFlow";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { Ctx } from "boardgame.io/dist/types/src/types";

const MAX_RIVAL_TROOPS = 3;

/**
 * Move called by each rival player (non-defender) to contribute
 * 0-3 regiments/levies to either side of a rebellion.
 */
const contributeToRebellion: Move<MyGameState> = (
  { G, ctx, playerID, events }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
  },
  side: "defender" | "rebel",
  regiments: number,
  levies: number
) => {
  const rebellion = G.currentRebellion;
  if (!rebellion) return INVALID_MOVE;
  if (rebellion.event.targetPlayerID === playerID) return INVALID_MOVE;
  if (!rebellion.rivalContributions) return INVALID_MOVE;

  const player = G.playerInfo[playerID];
  if (regiments < 0 || levies < 0) return INVALID_MOVE;
  if (regiments + levies > MAX_RIVAL_TROOPS) return INVALID_MOVE;
  if (regiments > player.resources.regiments) return INVALID_MOVE;
  if (levies > player.resources.levies) return INVALID_MOVE;

  // Record contribution and deduct troops from rival's kingdom
  rebellion.rivalContributions[playerID] = { side, regiments, levies };
  player.resources.regiments -= regiments;
  player.resources.levies -= levies;

  if (regiments + levies > 0) {
    logEvent(G, `${player.kingdomName} sends ${regiments}R/${levies}L to support the ${side}`);
  } else {
    logEvent(G, `${player.kingdomName} stays out of the rebellion`);
  }

  // Check if all rivals have contributed
  const targetID = rebellion.event.targetPlayerID;
  const allRivalsContributed = ctx.playOrder
    .filter((id) => id !== targetID)
    .every((id) => rebellion.rivalContributions![id] !== undefined);

  if (allRivalsContributed) {
    // Resolve the battle with defender + rival contributions
    resolveRebellionWithTroopsAndRivals(G, rebellion);

    G.currentRebellion = null;

    if (setupNextRebellion(G)) {
      G.stage = "rebellion";
      events.endTurn({ next: G.currentRebellion!.event.targetPlayerID });
    } else {
      continueResolution(G, events);
    }
  } else {
    // Next rival in IPO
    const nextRival = ctx.playOrder.find(
      (id) => id !== targetID && !rebellion.rivalContributions![id]
    );
    if (nextRival) {
      events.endTurn({ next: nextRival });
    }
  }
};

export default contributeToRebellion;
