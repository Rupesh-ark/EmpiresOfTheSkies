/**
 * sellSkyships.test.ts
 *
 * Tests for sellSkyships (v4.2 Anytime Option).
 *
 * Rules:
 *   Sell Skyships from Kingdom reserves to bank for 1 Gold each.
 *   Free action — no counsellor cost, no turnComplete.
 *
 *   INVALID_MOVE if:
 *     - Amount is 0 or negative
 *     - Player doesn't have enough skyships in reserve
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import sellSkyships from "../../moves/actions/sellSkyships";
import { buildInitialG, buildPlayer, buildResources, callMoveDef } from "../testHelpers";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, amount: number) {
  return callMoveDef(sellSkyships, G, playerID, amount).result;
}

describe("sellSkyships — successful sales", () => {
  it("sells 1 skyship for 1 Gold", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ skyships: 3, gold: 5 }) })]);
    callMove(G, "0", 1);
    expect(G.playerInfo["0"].resources.skyships).toBe(2);
    expect(G.playerInfo["0"].resources.gold).toBe(6);
  });

  it("sells multiple skyships", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ skyships: 5, gold: 0 }) })]);
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].resources.skyships).toBe(2);
    expect(G.playerInfo["0"].resources.gold).toBe(3);
  });

  it("does not set turnComplete", () => {
    const G = buildInitialG();
    callMove(G, "0", 1);
    expect(G.playerInfo["0"].turnComplete).toBe(false);
  });

  it("does not cost a counsellor", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 1);
    expect(G.playerInfo["0"].resources.counsellors).toBe(before);
  });
});

describe("sellSkyships — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when amount is 0", () => {
    const G = buildInitialG();
    expect(callMove(G, "0", 0)).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when amount is negative", () => {
    const G = buildInitialG();
    expect(callMove(G, "0", -1)).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has fewer skyships than requested", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ skyships: 1 }) })]);
    expect(callMove(G, "0", 5)).toBe(INVALID_MOVE);
  });
});
