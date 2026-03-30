/**
 * recruitCounsellors.test.ts
 *
 * Tests for recruitCounsellors (v4.2).
 *
 * Rules:
 *   - 3 slots on the action board; slots 1 and 2 cost 1 Gold each, slot 3 costs 2 Gold
 *   - Costs 1 counsellor (placed on board), grants +1 counsellor (net 0 this round, +1 at reset)
 *   - Move is INVALID if player is already at MAX_COUNSELLORS (7)
 *   - INVALID_MOVE if: 0 counsellors, slot already taken
 *   - Marks turnComplete = true
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import recruitCounsellors from "../../moves/actions/recruitCounsellors";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";
import { MAX_COUNSELLORS } from "../../data/gameData";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, slotIndex: number) {
  const ctx = buildCtx(playerID);
  return recruitCounsellors.fn({ G, ctx, playerID }, slotIndex);
}

describe("recruitCounsellors — costs", () => {
  it("slot 0 (first) costs 1 Gold and grants +1 counsellor", () => {
    const G = buildInitialG();
    const goldBefore = G.playerInfo["0"].resources.gold;
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 1);
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore);
  });

  it("slot 1 (second) costs 1 Gold and grants +1 counsellor", () => {
    const G = buildInitialG();
    G.boardState.recruitCounsellors[1] = "1"; // slot 0 taken
    const goldBefore = G.playerInfo["0"].resources.gold;
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 1);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 1);
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore);
  });

  it("slot 2 (third) costs 2 Gold and grants +1 counsellor", () => {
    const G = buildInitialG();
    G.boardState.recruitCounsellors[1] = "1";
    G.boardState.recruitCounsellors[2] = "1";
    const goldBefore = G.playerInfo["0"].resources.gold;
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 2);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 2);
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore);
  });
});

describe("recruitCounsellors — board state", () => {
  it("records the player in the correct slot", () => {
    const G = buildInitialG();
    callMove(G, "0", 0);
    expect(G.boardState.recruitCounsellors[1]).toBe("0");
  });

  it("marks turnComplete", () => {
    const G = buildInitialG();
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("recruitCounsellors — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ counsellors: 0 }) })]);
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when slot is already taken", () => {
    const G = buildInitialG();
    G.boardState.recruitCounsellors[1] = "1";
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player is already at MAX_COUNSELLORS", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: MAX_COUNSELLORS }) }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });
});
