/**
 * convertMonarch.test.ts
 *
 * Tests for convertMonarch (v4.2, B5).
 *
 * Rules:
 *   - Cost: 2 Gold AND 2 counsellors total (1 placed on board + 1 extra)
 *   - Flips hereticOrOrthodox between heretic ↔ orthodox
 *   - On flip: heresyTracker adjusts by ±prisoners, then prisoners reset to 0
 *   - INVALID_MOVE if: slot taken, slot > numPlayers, player already in board,
 *     < 2 counsellors, < 2 Gold
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import convertMonarch from "../../moves/actions/convertMonarch";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, slotIndex: number, numPlayers = 2) {
  const ctx = buildCtx(playerID, numPlayers);
  return convertMonarch.fn({ G, ctx, playerID }, slotIndex);
}

describe("convertMonarch — cost (v4.2: 2 Gold + 2 counsellors)", () => {
  it("costs 2 Gold", () => {
    const G = buildInitialG();
    const goldBefore = G.playerInfo["0"].resources.gold;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 2);
  });

  it("costs 2 counsellors total", () => {
    const G = buildInitialG();
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore - 2);
  });
});

describe("convertMonarch — faith flip", () => {
  it("changes an orthodox player to heretic", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "orthodox" })]);
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].hereticOrOrthodox).toBe("heretic");
  });

  it("changes a heretic player to orthodox", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "heretic" })]);
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].hereticOrOrthodox).toBe("orthodox");
  });

  it("resets prisoners to 0 after conversion", () => {
    const G = buildInitialG([buildPlayer("0", { prisoners: 3 })]);
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].prisoners).toBe(0);
  });

  it("heretic conversion: heresyTracker decreases by prisoner count", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "heretic", heresyTracker: 9, prisoners: 3 })]);
    callMove(G, "0", 0);
    // heresyTracker -= prisoners (3) → 9 - 3 = 6
    expect(G.playerInfo["0"].heresyTracker).toBe(6);
  });

  it("orthodox conversion: heresyTracker increases by prisoner count, clamped at HERESY_MAX (9)", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "orthodox", heresyTracker: 9, prisoners: 3 })]);
    callMove(G, "0", 0);
    // already at max (9), so stays at 9 — bounded by HERESY_MAX
    expect(G.playerInfo["0"].heresyTracker).toBe(9);
  });
});

describe("convertMonarch — board state", () => {
  it("records the player in the chosen slot", () => {
    const G = buildInitialG();
    callMove(G, "0", 0);
    expect(G.boardState.convertMonarch[1]).toBe("0");
  });

  it("marks turnComplete", () => {
    const G = buildInitialG();
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("convertMonarch — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when slot is already taken", () => {
    const G = buildInitialG();
    G.boardState.convertMonarch[1] = "1";
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when slot index > numPlayers", () => {
    const G = buildInitialG();
    // slotIndex 2 = slot 3 > numPlayers (2)
    const result = callMove(G, "0", 2, 2);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player already has a counsellor on the board", () => {
    const G = buildInitialG();
    G.boardState.convertMonarch[1] = "0"; // player already there
    const result = callMove(G, "0", 1);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has fewer than 2 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 1 }) }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("allows conversion with insufficient gold (goes into debt)", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 1 }) }),
      buildPlayer("1"),
    ]);
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.gold).toBe(-1);
  });
});