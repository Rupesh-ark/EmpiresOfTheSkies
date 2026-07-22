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
  G.battleState = undefined;

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
