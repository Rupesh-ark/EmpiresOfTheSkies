/**
 * resolutionFlow.ts
 *
 * Shared helper that advances through the Resolution phase stages:
 * Fleet combat → deferred events → rebellions → invasion → retrieve fleets
 *
 * Called from Resolution onBegin and from interactive moves
 * (respondToInfidelFleet, commitRebellionTroops, contributeToGrandArmy, etc.)
 * to determine what comes next.
 */

import { MyGameState } from "../types";
import { setupNextRebellion } from "./resolveRebellion";
import { resolveDeferredBattle } from "./resolveDeferredBattles";
import { checkForInvasion, getArchprelateForNomination } from "./resolveInvasion";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

/**
 * Continue the Resolution flow from the current point.
 * Checks each stage in order and activates the next interactive one,
 * or proceeds to "retrieve fleets" if nothing interactive remains.
 */
export const continueResolution = (
  G: MyGameState,
  events: EventsAPI
): void => {
  // 1. Auto-resolve non-rebellion deferred events
  const pending = G.eventState.deferredEvents;
  const nonRebellions = pending.filter(
    (e) => !e.card.endsWith("_rebellion")
  );
  for (const event of nonRebellions) {
    resolveDeferredBattle(G, event);
  }
  G.eventState.deferredEvents = pending.filter((e) =>
    e.card.endsWith("_rebellion")
  );

  // 2. Interactive rebellions
  if (G.eventState.deferredEvents.length > 0 && setupNextRebellion(G)) {
    G.stage = "rebellion";
    events.endTurn({ next: G.currentRebellion!.event.targetPlayerID });
    return;
  }

  // 3. Invasion check
  const invasionTriggered = checkForInvasion(G);
  if (invasionTriggered) {
    const archprelate = getArchprelateForNomination(G);
    if (archprelate) {
      G.stage = "invasion_nominate";
      events.endTurn({ next: archprelate });
      return;
    }
  }

  // 4. Nothing interactive left — retrieve fleets
  G.stage = "retrieve fleets";
  events.endTurn();
};
