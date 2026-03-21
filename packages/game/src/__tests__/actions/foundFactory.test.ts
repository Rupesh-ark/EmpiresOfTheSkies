/**
 * foundFactory.test.ts
 *
 * Tests for the foundFactory move (v4.2).
 *
 * Rules:
 *   - Cost = 1 Gold + 1 per slot already taken on foundFactories board
 *     → slot 1 = 1G, slot 2 = 2G, slot 3 = 3G, slot 4 = 4G
 *   - Player gains 1 factory
 *   - Consumes 1 counsellor
 *   - Marks turnComplete = true
 *   - INVALID_MOVE if: 0 counsellors, already at MAX_FACTORIES (6), slot already taken
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import foundFactory from "../../moves/actions/foundFactory";
import { buildInitialG, buildPlayer, buildCtx } from "../testHelpers";
import { MAX_FACTORIES } from "../../data/gameData";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, slotIndex: number) {
  const ctx = buildCtx(playerID);
  return foundFactory.fn({ G, ctx, playerID }, slotIndex);
}

describe("foundFactory — cost formula (v4.2)", () => {
  it("first slot (0) costs 1 Gold", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.gold; // 6
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.gold).toBe(before - 1);
  });

  it("second slot costs 2 Gold when first slot is already taken", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.boardState.foundFactories[1] = "0"; // simulate slot 0 taken
    const before = G.playerInfo["1"].resources.gold; // 6
    callMove(G, "1", 1);
    expect(G.playerInfo["1"].resources.gold).toBe(before - 2);
  });

  it("third slot costs 3 Gold when first two slots taken", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.boardState.foundFactories[1] = "0";
    G.boardState.foundFactories[2] = "1";
    const before = G.playerInfo["0"].resources.gold; // 6
    callMove(G, "0", 2);
    expect(G.playerInfo["0"].resources.gold).toBe(before - 3);
  });

  it("fourth slot costs 4 Gold when first three slots taken", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.boardState.foundFactories[1] = "0";
    G.boardState.foundFactories[2] = "1";
    G.boardState.foundFactories[3] = "0";
    const before = G.playerInfo["1"].resources.gold; // 6
    callMove(G, "1", 3);
    expect(G.playerInfo["1"].resources.gold).toBe(before - 4);
  });
});

describe("foundFactory — factory count", () => {
  it("increments the player's factory count by 1", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].factories; // 1 (v4.2 starting factory)
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].factories).toBe(before + 1);
  });
});

describe("foundFactory — counsellor cost", () => {
  it("consumes 1 counsellor", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.counsellors; // 4
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.counsellors).toBe(before - 1);
  });
});

describe("foundFactory — board state", () => {
  it("records the player in the foundFactories slot", () => {
    const G = buildInitialG();
    callMove(G, "0", 0);
    expect(G.boardState.foundFactories[1]).toBe("0");
  });

  it("marks turnComplete for the acting player", () => {
    const G = buildInitialG();
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("foundFactory — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([buildPlayer("0", { resources: { counsellors: 0 } as any })]);
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player already has MAX_FACTORIES (6)", () => {
    const G = buildInitialG([buildPlayer("0", { factories: MAX_FACTORIES })]);
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when the chosen slot is already taken", () => {
    const G = buildInitialG();
    G.boardState.foundFactories[1] = "1"; // slot 0 taken by player 1
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("does NOT return INVALID_MOVE on a valid move", () => {
    const G = buildInitialG();
    const result = callMove(G, "0", 0);
    expect(result).not.toBe(INVALID_MOVE);
  });
});