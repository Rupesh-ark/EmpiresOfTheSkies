/**
 * recruitRegiments.test.ts
 *
 * Tests for recruitRegiments (v4.2).
 *
 * Rules — 6 slots with increasing cost/reward:
 *   slot 1: 0 Gold → 1 regiment
 *   slot 2: 1 Gold → 2 regiments
 *   slot 3: 2 Gold → 4 regiments
 *   slot 4: 3 Gold → 6 regiments
 *   slot 5: 3 Gold → 7 regiments
 *   slot 6: 4 Gold → 9 regiments
 *
 *   All slots: cost 1 counsellor, mark turnComplete
 *   INVALID_MOVE if: 0 counsellors, slot already taken
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import recruitRegiments from "../../moves/actions/recruitRegiments";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, slotIndex: number) {
  const ctx = buildCtx(playerID);
  return (recruitRegiments as Function)({ G, ctx, playerID }, slotIndex);
}

const COST_TABLE: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 3, 5: 4 };
const REWARD_TABLE: Record<number, number> = { 0: 1, 1: 2, 2: 4, 3: 6, 4: 7, 5: 9 };

describe("recruitRegiments — cost and reward per slot", () => {
  for (let slotIndex = 0; slotIndex <= 5; slotIndex++) {
    it(`slot ${slotIndex + 1}: costs ${COST_TABLE[slotIndex]} Gold, grants ${REWARD_TABLE[slotIndex]} regiments`, () => {
      const G = buildInitialG();
      // Mark all lower slots as taken so this slotIndex is the first available
      for (let i = 1; i < slotIndex + 1; i++) {
        G.boardState.recruitRegiments[i as 1 | 2 | 3 | 4 | 5 | 6] = "1";
      }
      const goldBefore = G.playerInfo["0"].resources.gold;
      const regBefore = G.playerInfo["0"].resources.regiments;
      callMove(G, "0", slotIndex);
      expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - COST_TABLE[slotIndex]);
      expect(G.playerInfo["0"].resources.regiments).toBe(regBefore + REWARD_TABLE[slotIndex]);
    });
  }
});

describe("recruitRegiments — counsellor cost", () => {
  it("consumes 1 counsellor for any slot", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.counsellors).toBe(before - 1);
  });
});

describe("recruitRegiments — board state", () => {
  it("records the player in the slot", () => {
    const G = buildInitialG();
    callMove(G, "0", 0);
    expect(G.boardState.recruitRegiments[1]).toBe("0");
  });

  it("marks turnComplete", () => {
    const G = buildInitialG();
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("recruitRegiments — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ counsellors: 0 }) })]);
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when slot is already taken", () => {
    const G = buildInitialG();
    G.boardState.recruitRegiments[1] = "1";
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });
});