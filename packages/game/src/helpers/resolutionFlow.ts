/**
 * resolutionFlow.ts
 *
 * Walker that advances through the unified Resolution phase:
 *
 *   Rulebook order (Phase 5):
 *   1. Rebellions
 *   2. Encounters: aerial → plunder → ground → conquest
 *   3-6. Trade/Piracy/Factories (auto, handled in resolveRound)
 *   7. Election
 *   8. Infidel invasion check
 *   9. Retrieve fleets
 *
 * Each step either finds interactive work (sets stage, pauses) or chains
 * to the next step. The phase only ends after retrieve fleets.
 */

import { MyGameState } from "../types.js";
import log from "./logger.js";
import { setStage } from "./stageUtils.js";
import { setupNextRebellion } from "./resolveRebellion.js";
import { getDeferredBattleDescription } from "./resolveDeferredBattles.js";
import { checkForInvasion, getArchprelateForNomination } from "./resolveInvasion.js";
import { prepareInfidelFleetCombat } from "./resolveInfidelFleet.js";
import { findNextBattle, findNextPlunder, findNextGroundBattle, findNextConquest } from "./findNext.js";
import type { EventsAPI } from "../types.js";
import { sortPlayersInPlayerOrder } from "./helpers.js";

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

/** Continue through rebellions and invasion, then enter the retrieve-fleets phase. */
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

  events.endPhase();
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

// Resolution Walker
// Each "advance" function is called when its step is exhausted.
// It tries the NEXT step; if that step has no work, it chains further.

/**
 * Begin the resolution phase. Entry point from resolution.onBegin.
 * Walks: aerial → plunder → ground → conquest → election → post-election
 *
 * @param skipEndTurn — true when called from phase onBegin (boardgame.io discards endTurn there)
 */
const resLog = log.child({ mod: "res-flow" });

export const beginResolution = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false
): void => {
  resLog.info({ round: G.round }, "beginResolution");
  // Reset battle scan position
  G.mapState.currentBattle = [0, 0];
  // Start with aerial battles (step 2a in rulebook)
  findNextBattle(G, events, skipEndTurn, advanceFromAerial);
  resLog.info({ round: G.round }, "beginResolution done");
};

/** Called when aerial battles are exhausted → try plunder */
export const advanceFromAerial = (G: MyGameState, events: EventsAPI): void => {
  // DEBUG: detect infinite recursion in resolution chain
  (G as any)._resFlowDepth = ((G as any)._resFlowDepth ?? 0) + 1;
  if ((G as any)._resFlowDepth > 20) { resLog.error({ depth: (G as any)._resFlowDepth }, "infinite recursion detected at advanceFromAerial"); return; }
  G.mapState.currentBattle = [0, 0];
  findNextPlunder(G, events, advanceFromPlunder);
};

/** Called when plunder is exhausted → try ground battles */
export const advanceFromPlunder = (G: MyGameState, events: EventsAPI): void => {
  G.mapState.currentBattle = [0, 0];
  findNextGroundBattle(G, events, advanceFromGround);
};

/** Called when ground battles are exhausted → try conquest */
export const advanceFromGround = (G: MyGameState, events: EventsAPI): void => {
  G.mapState.currentBattle = [0, 0];
  findNextConquest(G, events, advanceFromConquest);
};

/** Called when conquests are exhausted → enter election */
export const advanceFromConquest = (G: MyGameState, events: EventsAPI): void => {
  enterElection(G, events);
};

/** Set up sequential election — each player votes in turn order */
export const enterElection = (G: MyGameState, events: EventsAPI): void => {
  G.electionResults = {};
  G.hasVoted = [];
  G.voteSubmitted = {};
  setStage(G, "resolution", "election");
  events.endTurn({ next: G.turnOrder[0] });
};

/**
 * Called when election is complete → post-election sequence.
 * Rulebook order: infidel invasion (step 8) → deferred battles → rebellions → invasion → retrieve fleets
 */
export const advanceFromElection = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false
): void => {
  // Infidel Fleet targeting + movement
  const hasCombat = prepareInfidelFleetCombat(G);
  if (hasCombat) {
    setStage(G, "resolution", "infidel_fleet_combat");
    if (!skipEndTurn) events.endTurn({ next: G.infidelFleetCombat!.targetPlayerID });
    return;
  }
  // No fleet combat — continue to deferred battles / rebellions / invasion / retrieve
  continuePostElection(G, events, skipEndTurn);
};

/**
 * Continue post-election flow (after infidel fleet combat if any).
 * Deferred battles → rebellions → invasion → retrieve fleets.
 */
export const continuePostElection = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false
): void => {
  setupNextDeferredBattle(G, events, skipEndTurn);
};
