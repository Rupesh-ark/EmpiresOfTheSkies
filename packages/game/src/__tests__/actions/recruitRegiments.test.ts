/**
 * recruitRegiments.test.ts
 *
 * Tests for recruitRegiments (v4.2).
 *
 * Rules:
 *   Cost = 1 Gold + 1 Gold per counsellor in the slot (including the one just placed)
 *   Reward = always 4 regiments
 *   Slot position = counsellor count, so slot N costs 1 + N Gold
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
  return recruitRegiments.fn({ G, ctx, playerID }, slotIndex);
}

describe("recruitRegiments — cost and reward per slot", () => {
  for (let slotIndex = 0; slotIndex <= 5; slotIndex++) {
    const slotPosition = slotIndex + 1;
    const expectedCost = 1 + slotPosition;
    it(`slot ${slotPosition}: costs ${expectedCost} Gold, grants 4 regiments`, () => {
      const G = buildInitialG();
      for (let i = 1; i < slotPosition; i++) {
        G.boardState.recruitRegiments[i as 1 | 2 | 3 | 4 | 5 | 6] = "1";
      }
      const goldBefore = G.playerInfo["0"].resources.gold;
      const regBefore = G.playerInfo["0"].resources.regiments;
      callMove(G, "0", slotIndex);
      expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - expectedCost);
      expect(G.playerInfo["0"].resources.regiments).toBe(regBefore + 4);
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