/**
 * heresyMoves.test.ts
 *
 * Tests for increaseHeresy and increaseOrthodoxy moves (v4.2).
 *
 * Rules:
 *   - Track has 19 spaces: internal range -9 (most orthodox) to +9 (most heretic)
 *   - increaseHeresy:    heresyTracker += 1, capped at 9 (only if < 9)
 *   - increaseOrthodoxy: heresyTracker -= 1, floored at -9 (only if > -9)
 *
 * Default buildPlayer has heresyTracker: 0.
 */

import { describe, it, expect } from "vitest";
import { increaseHeresy, increaseOrthodoxy } from "../../moves/actions/heresyMoves";
import { buildInitialG, buildPlayer, buildCtx } from "../testHelpers";

// ── increaseHeresy ────────────────────────────────────────────────────────────

describe("increaseHeresy", () => {
  it("increments heresyTracker by 1 when below the cap", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].heresyTracker; // 0
    increaseHeresy.fn({ G, ctx: buildCtx("0"), playerID: "0" });
    expect(G.playerInfo["0"].heresyTracker).toBe(before + 1);
  });

  it("does NOT increment heresyTracker when already at the cap (9)", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: 9 }),
      buildPlayer("1"),
    ]);
    increaseHeresy.fn({ G, ctx: buildCtx("0"), playerID: "0" });
    // Should remain at 9 — the cap prevents any further increase
    expect(G.playerInfo["0"].heresyTracker).toBe(9);
  });
});

// ── increaseOrthodoxy ─────────────────────────────────────────────────────────

describe("increaseOrthodoxy", () => {
  it("decrements heresyTracker by 1 when above the floor", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].heresyTracker; // 0
    increaseOrthodoxy.fn({ G, ctx: buildCtx("0"), playerID: "0" });
    expect(G.playerInfo["0"].heresyTracker).toBe(before - 1);
  });

  it("does NOT decrement heresyTracker when already at the floor (-9)", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: -9 }),
      buildPlayer("1"),
    ]);
    increaseOrthodoxy.fn({ G, ctx: buildCtx("0"), playerID: "0" });
    // Should remain at -9 — the floor prevents any further decrease
    expect(G.playerInfo["0"].heresyTracker).toBe(-9);
  });
});