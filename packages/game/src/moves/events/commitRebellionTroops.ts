import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState } from "../../types";
import { logEvent } from "../../helpers/stateUtils";
import {
  resolveRebellionWithTroops,
  setupNextRebellion,
} from "../../helpers/resolveRebellion";
import { checkForInvasion, getArchprelateForNomination } from "../../helpers/resolveInvasion";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { Ctx } from "boardgame.io/dist/types/src/types";

/**
 * Move called by the rebellion target player to choose how many
 * troops to commit to defend against the rebellion.
 *
 * TODO: Add a follow-up stage for rival players to contribute
 * up to 3 regiments/levies to either side.
 */
const commitRebellionTroops: Move<MyGameState> = (
  {
    G,
    ctx,
    playerID,
    events,
  }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
  },
  regiments: number,
  levies: number
) => {
  const rebellion = G.currentRebellion;
  if (!rebellion) return INVALID_MOVE;
  if (rebellion.event.targetPlayerID !== playerID) return INVALID_MOVE;

  const player = G.playerInfo[playerID];

  // Validate player has enough troops
  if (regiments < 0 || levies < 0) return INVALID_MOVE;
  if (regiments > player.resources.regiments) return INVALID_MOVE;
  if (levies > player.resources.levies) return INVALID_MOVE;

  const kingdom = player.kingdomName;
  logEvent(
    G,
    `${kingdom} commits ${regiments} regiments and ${levies} levies against the rebellion`
  );

  // Resolve the battle with chosen troops
  resolveRebellionWithTroops(G, rebellion, regiments, levies);

  // Clear current rebellion
  G.currentRebellion = null;

  // Check for more rebellions
  if (setupNextRebellion(G)) {
    // More rebellions — transfer turn to next target
    G.stage = "rebellion";
    events.endTurn({ next: G.currentRebellion!.event.targetPlayerID });
  } else {
    // No more rebellions — check for invasion
    const invasionTriggered = checkForInvasion(G);
    if (invasionTriggered) {
      const archprelate = getArchprelateForNomination(G);
      if (archprelate) {
        G.stage = "invasion_nominate";
        events.endTurn({ next: archprelate });
      } else {
        G.stage = "retrieve fleets";
        events.endTurn();
      }
    } else {
      G.stage = "retrieve fleets";
      events.endTurn();
    }
  }
};

export default commitRebellionTroops;
