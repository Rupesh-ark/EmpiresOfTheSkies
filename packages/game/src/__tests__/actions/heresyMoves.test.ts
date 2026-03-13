/**
 * heresyMoves.test.ts
 *
 * Tests for increaseHeresy and increaseOrthodoxy moves (v4.2).
 *
 * Rules:
 *   - increaseHeresy:    heresyTracker += 1, capped at 12 (only if < 12)
 *   - increaseOrthodoxy: heresyTracker -= 1, capped at -11 (only if > -11)
 *
 * Default buildPlayer has heresyTracker: 9.
 */

import { describe, it, expect } from "vitest";
import { increaseHeresy, increaseOrthodoxy } from "../../moves/actions/heresyMoves";
import { buildInitialG, buildPlayer, buildCtx } from "../testHelpers";

// ── increaseHeresy ────────────────────────────────────────────────────────────

describe("increaseHeresy", () => {
  it("increments heresyTracker by 1 when below the cap", () => {
    // Default heresyTracker is 9, well below the cap of 12
    const G = buildInitialG();
    const before = G.playerInfo["0"].heresyTracker; // 9
    (increaseHeresy as Function)({ G, ctx: buildCtx("0"), playerID: "0" });
    expect(G.playerInfo["0"].heresyTracker).toBe(before + 1); // 10
  });

  it("does NOT increment heresyTracker when already at the cap (12)", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: 12 }),
      buildPlayer("1"),
    ]);
    (increaseHeresy as Function)({ G, ctx: buildCtx("0"), playerID: "0" });
    // Should remain at 12 — the cap prevents any further increase
    expect(G.playerInfo["0"].heresyTracker).toBe(12);
  });
});

// ── increaseOrthodoxy ─────────────────────────────────────────────────────────

describe("increaseOrthodoxy", () => {
  it("decrements heresyTracker by 1 when above the floor", () => {
    // Default heresyTracker is 9, well above the floor of -11
    const G = buildInitialG();
    const before = G.playerInfo["0"].heresyTracker; // 9
    (increaseOrthodoxy as Function)({ G, ctx: buildCtx("0"), playerID: "0" });
    expect(G.playerInfo["0"].heresyTracker).toBe(before - 1); // 8
  });

  it("does NOT decrement heresyTracker when already at the floor (-11)", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: -11 }),
      buildPlayer("1"),
    ]);
    (increaseOrthodoxy as Function)({ G, ctx: buildCtx("0"), playerID: "0" });
    // Should remain at -11 — the floor prevents any further decrease
    expect(G.playerInfo["0"].heresyTracker).toBe(-11);
  });
});