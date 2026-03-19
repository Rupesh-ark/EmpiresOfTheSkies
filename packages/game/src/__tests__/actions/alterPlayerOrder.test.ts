/**
 * alterPlayerOrder.test.ts
 *
 * Tests for alterPlayerOrder (v4.2).
 *
 * Rules:
 *   - Player places a counsellor to claim a position in the new turn order
 *   - Costs 1 counsellor
 *   - INVALID_MOVE if: 0 counsellors, position > numPlayers, position already taken,
 *     player already has a position in boardState.alterPlayerOrder
 *   - Marks turnComplete = true
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import alterPlayerOrder from "../../moves/actions/alterPlayerOrder";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, positionIndex: number, numPlayers = 2) {
  const ctx = { ...buildCtx(playerID, numPlayers), currentPlayer: playerID };
  return alterPlayerOrder.fn({ G, ctx, playerID }, positionIndex);
}

describe("alterPlayerOrder — counsellor cost", () => {
  it("consumes 1 counsellor", () => {
    const G = buildInitialG();
    G.boardState.pendingPlayerOrder = { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined };
    const before = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.counsellors).toBe(before - 1);
  });
});

describe("alterPlayerOrder — player order update", () => {
  it("places the player in the chosen position of boardState.alterPlayerOrder", () => {
    const G = buildInitialG();
    G.boardState.pendingPlayerOrder = { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined };
    callMove(G, "0", 0);
    expect(G.boardState.pendingPlayerOrder[1]).toBe("0");
  });

  it("records the player on the action board slot", () => {
    const G = buildInitialG();
    G.boardState.pendingPlayerOrder = { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined };
    callMove(G, "0", 0);
    expect(G.boardState.pendingPlayerOrder[1]).toBe("0");
  });

  it("marks turnComplete", () => {
    const G = buildInitialG();
    G.boardState.pendingPlayerOrder = { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined };
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("alterPlayerOrder — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 0 }) }),
      buildPlayer("1"),
    ]);
    G.boardState.pendingPlayerOrder = { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined };
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when position > numPlayers", () => {
    const G = buildInitialG();
    G.boardState.pendingPlayerOrder = { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined };
    // positionIndex 2 = position 3, numPlayers = 2
    const result = callMove(G, "0", 2, 2);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when position is already taken", () => {
    const G = buildInitialG();
    G.boardState.pendingPlayerOrder = { 1: "1", 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined };
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player already has a position", () => {
    const G = buildInitialG();
    G.boardState.pendingPlayerOrder = { 1: undefined, 2: "0", 3: undefined, 4: undefined, 5: undefined, 6: undefined };
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });
});
