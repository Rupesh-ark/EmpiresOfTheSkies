// Same-tile and within-segment battle sequencing.

import { Ctx } from "boardgame.io";
import type { EventsAPI } from "../types.js";
import { MyGameState } from "../types.js";
import { sortPlayersInPlayerOrder } from "./helpers.js";
import {
  findNextBattle,
  findNextPlunder,
  findNextGroundBattle,
  findNextConquest,
} from "./findNext.js";

function computeDefendersAtBattle(G: MyGameState, nextPlayer: string): void {
  const [x, y] = G.mapState.currentBattle;
  G.possibleDefenders = (G.mapState.battleMap[y]?.[x] ?? []).filter(
    (id) => id !== nextPlayer
  );
}

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

export function nextAfterAerialDecision(
  G: MyGameState,
  ctx: Ctx,
  events: EventsAPI,
  lastAttackerID: string
): void {
  const originalAttackerID = G.battleState?.attacker.id ?? lastAttackerID;
  const wasEvasion = G.battleState?.defender.decision === "evade";
  G.battleState = undefined;

  if (wasEvasion) {
    const [x, y] = G.mapState.currentBattle;
    const challengedPairs =
      G.aerialChallenges?.tile[0] === x &&
      G.aerialChallenges.tile[1] === y
        ? G.aerialChallenges.pairs
        : [];
    const unchallengedRivals = (G.mapState.battleMap[y]?.[x] ?? []).filter(
      (id) =>
        id !== originalAttackerID &&
        !challengedPairs.includes(`${originalAttackerID}>${id}`)
    );

    if (unchallengedRivals.length > 0) {
      // eots42:366 — an evasion leaves the serial challenge with the original
      // attacker. The challenged-pair set only grows, preventing a loop.
      G.step = "aerial_attack_or_pass";
      G.possibleDefenders = unchallengedRivals;
      events.endTurn({ next: originalAttackerID });
      return;
    }
  }

  const nextPlayer = getNextPlayerAtTile(G, lastAttackerID);
  if (nextPlayer) {
    G.step = "aerial_attack_or_pass";
    computeDefendersAtBattle(G, nextPlayer);
    events.endTurn({ next: nextPlayer });
  } else {
    findNextBattle(G, events);
  }
}

export function nextAfterPlunder(
  G: MyGameState,
  events: EventsAPI
): void {
  findNextPlunder(G, events);
}

export function nextAfterGroundDecision(
  G: MyGameState,
  ctx: Ctx,
  events: EventsAPI,
  lastAttackerID: string
): void {
  G.battleState = undefined;

  const nextPlayer = getNextPlayerAtTile(G, lastAttackerID);
  if (nextPlayer) {
    G.step = "ground_attack_or_pass";
    computeDefendersAtBattle(G, nextPlayer);
    events.endTurn({ next: nextPlayer });
  } else {
    findNextGroundBattle(G, events);
  }
}

export function nextAfterConquest(
  G: MyGameState,
  events: EventsAPI
): void {
  findNextConquest(G, events);
}
