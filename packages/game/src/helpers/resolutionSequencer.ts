/**
 * resolutionSequencer.ts — Single source of truth for resolution phase transitions.
 *
 * Every resolution move calls ONE of these functions after doing its work.
 * The sequencer reads G to decide the next stage/player/tile.
 *
 * This replaces the scattered findNext* + advanceFrom* callback chains
 * that were in individual move files.
 *
 * Resolution order (v4.2):
 *   aerial battles → plunder → ground battles → conquest → election
 *   → post-election (infidel fleet, deferred battles, rebellions, invasion, retrieve)
 */

import { Ctx } from "boardgame.io";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { MyGameState } from "../types";
import { setStage } from "./stageUtils";
import { sortPlayersInPlayerOrder } from "./helpers";
import {
  findNextBattle,
  findNextPlunder,
  findNextGroundBattle,
  findNextConquest,
} from "./findNext";
import {
  enterElection,
  advanceFromElection,
} from "./resolutionFlow";

// Re-export for moves that need to start the resolution
export { beginResolution } from "./resolutionFlow";

// ── Sequence step callbacks (passed to findNext* as onExhausted) ────────────

const toPlunder = (G: MyGameState, events: EventsAPI): void => {
  G.mapState.currentBattle = [0, 0];
  findNextPlunder(G, events, toGround);
};

const toGround = (G: MyGameState, events: EventsAPI): void => {
  G.mapState.currentBattle = [0, 0];
  findNextGroundBattle(G, events, toConquest);
};

const toConquest = (G: MyGameState, events: EventsAPI): void => {
  G.mapState.currentBattle = [0, 0];
  findNextConquest(G, events, toElection);
};

const toElection = (G: MyGameState, events: EventsAPI): void => {
  enterElection(G, events);
};

// ── Compute who's next at the current battle tile ───────────────────────────

function computeDefendersAtBattle(G: MyGameState, nextPlayer: string): void {
  const [x, y] = G.mapState.currentBattle;
  G.possibleDefenders = (G.mapState.battleMap[y]?.[x] ?? []).filter(
    (id) => id !== nextPlayer
  );
}

/**
 * Find the next player in battle order at the current tile.
 * Returns the next playerID, or null if all players have had their turn.
 */
function getNextPlayerAtTile(
  G: MyGameState,
  currentPlayerID: string
): string | null {
  const [x, y] = G.mapState.currentBattle;
  const playersAtTile = [...G.mapState.battleMap[y]?.[x] ?? []];

  if (playersAtTile.length <= 1) return null;

  const sorted = sortPlayersInPlayerOrder(playersAtTile, G);
  const currentIndex = sorted.indexOf(currentPlayerID);

  if (currentIndex < 0 || currentIndex >= sorted.length - 1) return null;
  return sorted[currentIndex + 1];
}

// ── Public API: called by resolution moves ──────────────────────────────────

/**
 * Called after: doNotAttack, relocateDefeatedFleet, evadeAttackingFleet (force home),
 *              resolveBattle (total annihilation/draw — aerial path only)
 *
 * Advances to the next player at this battle tile, or the next tile, or plunder.
 */
export function nextAfterAerialDecision(
  G: MyGameState,
  ctx: Ctx,
  events: EventsAPI,
  lastAttackerID: string
): void {
  G.battleState = undefined;

  const nextPlayer = getNextPlayerAtTile(G, lastAttackerID);
  if (nextPlayer) {
    // More players at this tile — give them attack_or_pass
    setStage(G, "resolution", "aerial_attack_or_pass");
    computeDefendersAtBattle(G, nextPlayer);
    events.endTurn({ next: nextPlayer });
  } else {
    // All players at this tile have had their turn — scan for next battle tile
    findNextBattle(G, events, false, toPlunder);
  }
}

/**
 * Called after: plunder, doNotPlunder
 *
 * Scans for the next plunder tile, or advances to ground battles.
 */
export function nextAfterPlunder(
  G: MyGameState,
  events: EventsAPI
): void {
  findNextPlunder(G, events, toGround);
}

/**
 * Called after: doNotGroundAttack, yieldToAttacker, garrisonTroops (ground),
 *              resolveBattle (ground path — total annihilation/draw)
 *
 * Advances to the next player at this tile, or next ground tile, or conquest.
 */
export function nextAfterGroundDecision(
  G: MyGameState,
  ctx: Ctx,
  events: EventsAPI,
  lastAttackerID: string
): void {
  G.battleState = undefined;

  const nextPlayer = getNextPlayerAtTile(G, lastAttackerID);
  if (nextPlayer) {
    setStage(G, "resolution", "ground_attack_or_pass");
    computeDefendersAtBattle(G, nextPlayer);
    events.endTurn({ next: nextPlayer });
  } else {
    findNextGroundBattle(G, events, toConquest);
  }
}

/**
 * Called after: doNothing (skip conquest), garrisonTroops (conquest),
 *              resolveBattle (conquest — failed/succeeded)
 *
 * Scans for the next conquest tile, or advances to election.
 */
export function nextAfterConquest(
  G: MyGameState,
  events: EventsAPI
): void {
  findNextConquest(G, events, toElection);
}

/**
 * Called after: all election votes cast
 *
 * Advances to post-election sequence (infidel fleet, deferred battles, etc.)
 */
export { advanceFromElection as nextAfterElection };
