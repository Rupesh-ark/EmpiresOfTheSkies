/**
 * resolutionFlow.ts
 *
 * Shared helper that advances through the Resolution phase stages:
 * Fleet combat → deferred battles → rebellions → invasion → retrieve fleets
 *
 * Called from Resolution onBegin and from interactive moves
 * (respondToInfidelFleet, commitDeferredBattleCard, commitRebellionTroops,
 * contributeToGrandArmy, etc.) to determine what comes next.
 */

import { MyGameState } from "../types";
import { setupNextRebellion } from "./resolveRebellion";
import { getDeferredBattleDescription } from "./resolveDeferredBattles";
import { checkForInvasion, getArchprelateForNomination } from "./resolveInvasion";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

/**
 * Set up the next non-rebellion deferred battle for interactive resolution.
 * If one exists, transitions to deferred_battle stage and pauses.
 * If none remain, continues to rebellions → invasion → retrieve fleets.
 */
export const setupNextDeferredBattle = (
  G: MyGameState,
  events: EventsAPI
): void => {
  // Find next non-rebellion deferred event
  const idx = G.eventState.deferredEvents.findIndex(
    (e) => !e.card.endsWith("_rebellion")
  );

  if (idx >= 0) {
    const event = G.eventState.deferredEvents.splice(idx, 1)[0];
    G.currentDeferredBattle = {
      event,
      description: getDeferredBattleDescription(G, event),
    };
    G.stage = "deferred_battle";
    events.endTurn({ next: event.targetPlayerID });
    return;
  }

  // No more deferred battles — continue to rebellions → invasion
  continueAfterDeferredBattles(G, events);
};

/**
 * Continue the Resolution flow after all deferred battles are resolved.
 */
const continueAfterDeferredBattles = (
  G: MyGameState,
  events: EventsAPI
): void => {
  // Interactive rebellions
  if (G.eventState.deferredEvents.length > 0 && setupNextRebellion(G)) {
    G.stage = "rebellion";
    events.endTurn({ next: G.currentRebellion!.event.targetPlayerID });
    return;
  }

  // Invasion check
  const invasionTriggered = checkForInvasion(G);
  if (invasionTriggered) {
    const archprelate = getArchprelateForNomination(G);
    if (archprelate) {
      G.stage = "invasion_nominate";
      events.endTurn({ next: archprelate });
      return;
    }
  }

  // Nothing interactive left — retrieve fleets
  G.stage = "retrieve fleets";
  events.endTurn({ next: G.turnOrder[0] });
};

/**
 * Continue the Resolution flow from the current point.
 * Entry point called from Resolution onBegin and after Fleet combat.
 */
export const continueResolution = (
  G: MyGameState,
  events: EventsAPI
): void => {
  // Try to set up first deferred battle (interactive)
  setupNextDeferredBattle(G, events);
};
