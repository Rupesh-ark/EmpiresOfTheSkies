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
import { setStage } from "./stageUtils";
import { setupNextRebellion } from "./resolveRebellion";
import { getDeferredBattleDescription } from "./resolveDeferredBattles";
import { checkForInvasion, getArchprelateForNomination } from "./resolveInvasion";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

/**
 * Set up the next non-rebellion deferred battle for interactive resolution.
 * If one exists, transitions to deferred_battle stage and pauses.
 * If none remain, continues to rebellions → invasion → retrieve fleets.
 *
 * @param skipEndTurn — if true, sets G.stage but does NOT call endTurn.
 *   Used when called from phase onBegin where endTurn is silently discarded
 *   by boardgame.io (see docs/BOARDGAMEIO_ENDTURN_ONBEGIN.md).
 *   The turn.onBegin hook handles redirection via getResolutionTarget().
 */
export const setupNextDeferredBattle = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false
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
    setStage(G, "resolution", "deferred_battle");
    if (!skipEndTurn) events.endTurn({ next: event.targetPlayerID });
    return;
  }

  // No more deferred battles — continue to rebellions → invasion
  continueAfterDeferredBattles(G, events, skipEndTurn);
};

/**
 * Continue the Resolution flow after all deferred battles are resolved.
 */
const continueAfterDeferredBattles = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false
): void => {
  // Interactive rebellions
  if (G.eventState.deferredEvents.length > 0 && setupNextRebellion(G)) {
    setStage(G, "resolution", "rebellion");
    if (!skipEndTurn) events.endTurn({ next: G.currentRebellion!.event.targetPlayerID });
    return;
  }

  // Invasion check
  const invasionTriggered = checkForInvasion(G);
  if (invasionTriggered) {
    const archprelate = getArchprelateForNomination(G);
    if (archprelate) {
      setStage(G, "resolution", "invasion_nominate");
      if (!skipEndTurn) events.endTurn({ next: archprelate });
      return;
    }
  }

  // Nothing interactive left — retrieve fleets
  setStage(G, "resolution", "retrieve_fleets");
  if (!skipEndTurn) events.endTurn({ next: G.turnOrder[0] });
};

/**
 * Continue the Resolution flow from the current point.
 * Entry point called from Resolution onBegin and after Fleet combat.
 *
 * @param skipEndTurn — pass true when called from phase onBegin
 */
export const continueResolution = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false
): void => {
  // Try to set up first deferred battle (interactive)
  setupNextDeferredBattle(G, events, skipEndTurn);
};

/**
 * Determine which player should have the turn for the current resolution stage.
 * Pure read — no side effects. Used by turn.onBegin to redirect the turn
 * when phase onBegin couldn't (see docs/BOARDGAMEIO_ENDTURN_ONBEGIN.md).
 *
 * Returns the target playerID, or null if normal turn order is fine.
 */
export const getResolutionTarget = (G: MyGameState): string | null => {
  switch (G.stage.sub) {
    case "infidel_fleet_combat":
      return G.infidelFleetCombat?.targetPlayerID ?? null;

    case "deferred_battle":
      return G.currentDeferredBattle?.event.targetPlayerID ?? null;

    case "rebellion":
      return G.currentRebellion?.event.targetPlayerID ?? null;

    case "invasion_nominate":
      return Object.values(G.playerInfo).find((p) => p.isArchprelate)?.id ?? null;

    default:
      return null; // retrieve fleets, rebellion_rival_support, etc. use normal turn order
  }
};
