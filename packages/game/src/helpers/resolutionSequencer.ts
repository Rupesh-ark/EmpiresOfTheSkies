// Resolution order: aerial → plunder → ground → conquest → election → post-election

import { Ctx } from "boardgame.io";
import type { EventsAPI } from "../types.js";
import { MyGameState } from "../types.js";
import { setStage } from "./stageUtils.js";
import { sortPlayersInPlayerOrder } from "./helpers.js";
import {
  findNextBattle,
  findNextPlunder,
  findNextGroundBattle,
  findNextConquest,
} from "./findNext.js";
import {
  enterElection,
  advanceFromElection,
} from "./resolutionFlow.js";

export { beginResolution } from "./resolutionFlow.js";

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
    setStage(G, "resolution", "aerial_attack_or_pass");
    computeDefendersAtBattle(G, nextPlayer);
    events.endTurn({ next: nextPlayer });
  } else {
    findNextBattle(G, events, false, toPlunder);
  }
}

export function nextAfterPlunder(
  G: MyGameState,
  events: EventsAPI
): void {
  findNextPlunder(G, events, toGround);
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
    setStage(G, "resolution", "ground_attack_or_pass");
    computeDefendersAtBattle(G, nextPlayer);
    events.endTurn({ next: nextPlayer });
  } else {
    findNextGroundBattle(G, events, toConquest);
  }
}

export function nextAfterConquest(
  G: MyGameState,
  events: EventsAPI
): void {
  findNextConquest(G, events, toElection);
}

export { advanceFromElection as nextAfterElection };
