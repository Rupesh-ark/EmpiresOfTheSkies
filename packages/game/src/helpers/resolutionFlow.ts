/** Shared handoffs for interactive resolution work. */

import { MyGameState } from "../types.js";
import { setupNextRebellion } from "./resolveRebellion.js";
import { getDeferredBattleDescription } from "./resolveDeferredBattles.js";
import { checkForInvasion, getArchprelateForNomination } from "./resolveInvasion.js";
import type { EventsAPI } from "../types.js";

/**
 * Set up the next non-rebellion deferred battle for interactive resolution.
 * If one exists, transitions to deferred_battle stage and pauses.
 *
 * @param skipEndTurn — if true, sets G.step but does NOT call endTurn.
 *   Used when called from phase onBegin where endTurn is silently discarded
 *   by boardgame.io (see docs/BOARDGAMEIO_ENDTURN_ONBEGIN.md).
 *   The turn.onBegin hook handles redirection via getResolutionTarget().
 */
export const setupNextDeferredBattle = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false
): boolean => {
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
    G.step = "deferred_battle";
    if (!skipEndTurn) events.endTurn({ next: event.targetPlayerID });
    return true;
  }

  return false;
};

/** Route to the next rebellion, or finish the rebellions phase. */
export const nextAfterRebellion = (
  G: MyGameState,
  events: EventsAPI
): void => {
  if (setupNextRebellion(G)) {
    G.step = "rebellion";
    events.endTurn({ next: G.currentRebellion!.event.targetPlayerID });
    return;
  }

  events.endPhase();
};

/**
 * Determine which player should have the turn for the current resolution stage.
 * Pure read — no side effects. Used by turn.onBegin to redirect the turn
 * when phase onBegin couldn't (see docs/BOARDGAMEIO_ENDTURN_ONBEGIN.md).
 *
 * Returns the target playerID, or null if normal turn order is fine.
 */
export const getResolutionTarget = (G: MyGameState): string | null => {
  switch (G.step) {
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

/** Run the invasion draw and route interactive nomination when required. */
export const runInvasionCheck = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false
): void => {
  if (checkForInvasion(G)) {
    const archprelate = getArchprelateForNomination(G);
    if (archprelate) {
      G.step = "invasion_nominate";
      if (!skipEndTurn) events.endTurn({ next: archprelate });
      return;
    }
  }

  events.endPhase();
};
