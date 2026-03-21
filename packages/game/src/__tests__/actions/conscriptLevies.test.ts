/**
 * conscriptLevies.test.ts
 *
 * Tests for conscriptLevies (v4.2).
 *
 * Rules:
 *   - Cost: 1 counsellor + ceiling(levyAmount / 3) VP
 *     → 1–3 levies = 1 VP, 4–6 = 2 VP, 7–9 = 3 VP, 10–12 = 4 VP
 *   - Player gains the requested levyAmount levies
 *   - MAX_LEVIES = 12; cannot exceed this total
 *   - Can only use this action once per round (playerBoardCounsellorLocations.conscriptLevies flag)
 *   - INVALID_MOVE if: 0 counsellors, levyAmount <= 0, would exceed MAX_LEVIES, already used
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import conscriptLevies from "../../moves/actions/conscriptLevies";
import { buildInitialG, buildPlayer, buildCtx, buildResources, buildPlayerBoard } from "../testHelpers";
import { MAX_LEVIES } from "../../data/gameData";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, levyAmount: number) {
  const ctx = buildCtx(playerID);
  return conscriptLevies.fn({ G, ctx, playerID }, levyAmount);
}

describe("conscriptLevies — levy gain", () => {
  it("adds the requested number of levies to the player", () => {
    const G = buildInitialG();
    callMove(G, "0", 6);
    expect(G.playerInfo["0"].resources.levies).toBe(6);
  });

  it("can conscript up to MAX_LEVIES (12) in one action if starting from 0", () => {
    const G = buildInitialG();
    callMove(G, "0", 12);
    expect(G.playerInfo["0"].resources.levies).toBe(12);
  });
});

describe("conscriptLevies — VP cost (v4.2: ceil(levyAmount/3))", () => {
  const cases: [number, number][] = [
    [1, 1],   // 1 levy  = 1 VP
    [3, 1],   // 3 levies = 1 VP
    [4, 2],   // 4 levies = 2 VP
    [6, 2],   // 6 levies = 2 VP
    [7, 3],   // 7 levies = 3 VP
    [9, 3],   // 9 levies = 3 VP
    [10, 4],  // 10 levies = 4 VP
    [12, 4],  // 12 levies = 4 VP
  ];
  for (const [amount, vpCost] of cases) {
    it(`conscripting ${amount} levies costs ${vpCost} VP`, () => {
      const G = buildInitialG();
      const vpBefore = G.playerInfo["0"].resources.victoryPoints;
      callMove(G, "0", amount);
      expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore - vpCost);
    });
  }
});

describe("conscriptLevies — counsellor cost", () => {
  it("consumes 1 counsellor", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].resources.counsellors).toBe(before - 1);
  });
});

describe("conscriptLevies — once-per-round flag", () => {
  it("sets the conscriptLevies flag after use", () => {
    const G = buildInitialG();
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].playerBoardCounsellorLocations.conscriptLevies).toBe(true);
  });

  it("marks turnComplete", () => {
    const G = buildInitialG();
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("conscriptLevies — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ counsellors: 0 }) })]);
    const result = callMove(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when levyAmount is 0", () => {
    const G = buildInitialG();
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when levyAmount is negative", () => {
    const G = buildInitialG();
    const result = callMove(G, "0", -3);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when conscripting would exceed MAX_LEVIES", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ levies: 10 }) })]);
    // 10 existing + 3 more = 13 > MAX_LEVIES (12)
    const result = callMove(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });

  it("allows conscripting exactly up to MAX_LEVIES", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ levies: 9 }) })]);
    const result = callMove(G, "0", 3); // 9 + 3 = 12 exactly
    expect(result).not.toBe(INVALID_MOVE);
    expect(G.playerInfo["0"].resources.levies).toBe(MAX_LEVIES);
  });

  it("returns INVALID_MOVE if player already conscripted levies this round", () => {
    const G = buildInitialG([
      buildPlayer("0", { playerBoardCounsellorLocations: buildPlayerBoard({ conscriptLevies: true }) }),
    ]);
    const result = callMove(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });
});