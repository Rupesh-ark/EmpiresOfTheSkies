/**
 * purchaseSkyships.test.ts
 *
 * Tests for the purchaseSkyships move (v4.2).
 *
 * Rules:
 *   - Cost = 2 Gold + 1 per counsellor placed (including this one)
 *     → slot 1 = 3 Gold, slot 2 = 4 Gold
 *   - Player gains 2 skyships
 *   - Consumes 1 counsellor
 *   - Marks turnComplete = true
 *   - INVALID_MOVE if: 0 counsellors, slot already taken
 *   - Two separate tracks: Zeeland and Venoa (each with 2 slots)
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import purchaseSkyships from "../../moves/actions/purchaseSkyships";
import { buildInitialG, buildPlayer, buildCtx } from "../testHelpers";

// Helper: call the move as boardgame.io would
function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, slotIndex: number, republic: "zeeland" | "venoa") {
  const ctx = buildCtx(playerID);
  return purchaseSkyships.fn({ G, ctx, playerID }, slotIndex, republic);
}

describe("purchaseSkyships — cost formula (v4.2)", () => {
  it("slot 0 (first) costs 3 Gold", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.gold; // 6
    callMove(G, "0", 0, "zeeland");
    expect(G.playerInfo["0"].resources.gold).toBe(before - 3);
  });

  it("slot 1 (second) costs 4 Gold — slot is more expensive once slot 0 is taken", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.gold; // 6
    // First take slot 0 with player "0"
    callMove(G, "0", 0, "zeeland");
    // Now slot 0 is taken; slot 1 should cost 4
    const G2 = buildInitialG([buildPlayer("1")]);
    G2.boardState.purchaseSkyshipsZeeland[1] = "0"; // simulate slot 0 already taken
    const before2 = G2.playerInfo["1"].resources.gold; // 6
    callMove(G2, "1", 1, "zeeland");
    expect(G2.playerInfo["1"].resources.gold).toBe(before2 - 4);
  });
});

describe("purchaseSkyships — skyship gain", () => {
  it("grants 2 skyships to the player", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.skyships; // 3
    callMove(G, "0", 0, "zeeland");
    expect(G.playerInfo["0"].resources.skyships).toBe(before + 2);
  });
});

describe("purchaseSkyships — counsellor cost", () => {
  it("consumes 1 counsellor", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.counsellors; // 4
    callMove(G, "0", 0, "zeeland");
    expect(G.playerInfo["0"].resources.counsellors).toBe(before - 1);
  });
});

describe("purchaseSkyships — board state", () => {
  it("records the player in the board slot for zeeland", () => {
    const G = buildInitialG();
    callMove(G, "0", 0, "zeeland");
    expect(G.boardState.purchaseSkyshipsZeeland[1]).toBe("0");
  });

  it("records the player in the board slot for venoa", () => {
    const G = buildInitialG();
    callMove(G, "0", 0, "venoa");
    expect(G.boardState.purchaseSkyshipsVenoa[1]).toBe("0");
  });

  it("zeeland and venoa are independent tracks", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    callMove(G, "0", 0, "zeeland");
    callMove(G, "1", 0, "venoa");
    expect(G.boardState.purchaseSkyshipsZeeland[1]).toBe("0");
    expect(G.boardState.purchaseSkyshipsVenoa[1]).toBe("1");
    // zeeland slot 2 untouched
    expect(G.boardState.purchaseSkyshipsZeeland[2]).toBeUndefined();
  });

  it("marks turnComplete for the acting player", () => {
    const G = buildInitialG();
    callMove(G, "0", 0, "zeeland");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("purchaseSkyships — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([buildPlayer("0", { resources: { counsellors: 0 } as any })]);
    const result = callMove(G, "0", 0, "zeeland");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when the chosen slot is already taken", () => {
    const G = buildInitialG();
    // Take slot 0 first
    callMove(G, "0", 0, "zeeland");
    // Player 1 tries the same slot
    const result = callMove(G, "1", 0, "zeeland");
    expect(result).toBe(INVALID_MOVE);
  });

  it("does NOT return INVALID_MOVE when taking slot 1 on a fresh board", () => {
    const G = buildInitialG();
    const result = callMove(G, "0", 0, "zeeland");
    expect(result).not.toBe(INVALID_MOVE);
  });
});