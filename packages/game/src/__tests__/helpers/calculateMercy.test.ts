/**
 * calculateMercy.test.ts
 *
 * Tests for the `calculateMercy(G)` catch-up mechanic (v4.2, Taxes Phase).
 *
 * How it works:
 *   1. Find leaderVP = max VP across all players.
 *   2. For each player strictly below the leader:
 *        baseMercy = floor((leaderVP - playerVP) / 3)
 *   3. Count supporting republics (Venoa = slot 5, Zeeland = slot 4):
 *        A republic supports if its alignment matches the player's alignment,
 *        OR if the player has influence in that republic's prelate slot.
 *        Republic is orthodox by default, heretic if in G.eventState.nprHeretic.
 *   4. Multiplier: 0 republics → 0 gold, 1 republic → floor(baseMercy * 0.5),
 *                  2 republics → baseMercy
 */

import { describe, it, expect } from "vitest";
import { calculateMercy } from "../../helpers/stateUtils";
import { buildInitialG, buildPlayer, buildResources } from "../testHelpers";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shorthand to build a 2-player G with specified VPs and alignments.
 *  Player "0" is the leader, player "1" is the trailer by default.
 */
function buildTwoPlayerG(opts: {
  leaderVP?: number;
  trailerVP?: number;
  trailerAlignment?: "orthodox" | "heretic";
  influencePrelates?: Record<number, string | undefined>;
  nprHeretic?: string[];
  leaderGold?: number;
  trailerGold?: number;
}) {
  const {
    leaderVP = 30,
    trailerVP = 21,
    trailerAlignment = "orthodox",
    influencePrelates,
    nprHeretic = [],
    leaderGold = 0,
    trailerGold = 0,
  } = opts;

  const G = buildInitialG([
    buildPlayer("0", { resources: buildResources({ victoryPoints: leaderVP, gold: leaderGold }) }),
    buildPlayer("1", {
      hereticOrOrthodox: trailerAlignment,
      resources: buildResources({ victoryPoints: trailerVP, gold: trailerGold }),
    }),
  ]);
  G.eventState.nprHeretic = nprHeretic;
  if (influencePrelates) {
    G.boardState.influencePrelates = {
      ...G.boardState.influencePrelates,
      ...influencePrelates,
    };
  }
  return G;
}

// ── No mercy cases ────────────────────────────────────────────────────────────

describe("calculateMercy — no mercy cases", () => {
  it("gives no gold when all players are tied at the same VP", () => {
    // All players have equal VP → gap = 0 → baseMercy = floor(0/3) = 0 → skipped.
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ victoryPoints: 15, gold: 5 }) }),
      buildPlayer("1", { resources: buildResources({ victoryPoints: 15, gold: 5 }) }),
    ]);

    calculateMercy(G);

    expect(G.playerInfo["0"].resources.gold).toBe(5);
    expect(G.playerInfo["1"].resources.gold).toBe(5);
  });

  it("gives no gold when the gap is less than 3 (gap = 2)", () => {
    // Leader 10, trailer 8 → gap 2 → floor(2/3) = 0 → skipped.
    const G = buildTwoPlayerG({ leaderVP: 10, trailerVP: 8, trailerGold: 3 });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3); // unchanged
  });

  it("gives no gold when 0 republics support the trailing player", () => {
    // Both republics are orthodox, player is heretic → alignment mismatch, no influence.
    const G = buildTwoPlayerG({
      leaderVP: 30,
      trailerVP: 21,  // gap 9, baseMercy 3
      trailerAlignment: "heretic",
      nprHeretic: [],
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(0); // no mercy, 0 republics
  });

  it("leader receives no mercy even when gap formula would give a positive value for others", () => {
    // Player "0" is the leader — gap is 0 so they are skipped.
    const G = buildTwoPlayerG({ leaderVP: 30, trailerVP: 21, leaderGold: 5 });
    G.eventState.nprHeretic = []; // both orthodox

    calculateMercy(G);

    expect(G.playerInfo["0"].resources.gold).toBe(5); // leader unchanged
  });
});

// ── Base mercy calculation ─────────────────────────────────────────────────────

describe("calculateMercy — base mercy calculation", () => {
  it("calculates baseMercy = floor(gap / 3) correctly for gap = 9", () => {
    // leader 30, trailer 21 → gap 9 → baseMercy = 3.
    // Both republics orthodox, trailer orthodox → 2 supporting → full baseMercy = 3.
    const G = buildTwoPlayerG({
      leaderVP: 30,
      trailerVP: 21,
      trailerAlignment: "orthodox",
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3);
  });

  it("floors baseMercy correctly — gap = 11 gives baseMercy = 3, not 3.67", () => {
    // gap 11 → floor(11/3) = 3. 2 supporting → gold = 3.
    const G = buildTwoPlayerG({ leaderVP: 30, trailerVP: 19, trailerAlignment: "orthodox", trailerGold: 0 });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3);
  });
});

// ── Republic support — alignment matching ─────────────────────────────────────

describe("calculateMercy — republic support via alignment", () => {
  it("orthodox player gets both orthodox republics supporting → full baseMercy", () => {
    // Both Venoa and Zeeland are orthodox (default). Player "1" is orthodox.
    // gap 9, baseMercy 3, 2 supporting → 3 gold.
    const G = buildTwoPlayerG({ trailerAlignment: "orthodox", nprHeretic: [], trailerGold: 0 });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3);
  });

  it("heretic player, both republics orthodox — 0 supporting, 0 gold", () => {
    const G = buildTwoPlayerG({ trailerAlignment: "heretic", nprHeretic: [], trailerGold: 5 });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(5); // unchanged
  });

  it("both republics heretic, heretic player — 2 supporting → full baseMercy", () => {
    // Venoa and Zeeland both turned heretic via nprHeretic; player is heretic.
    // gap 9, baseMercy 3, 2 supporting → 3 gold.
    const G = buildTwoPlayerG({
      trailerAlignment: "heretic",
      nprHeretic: ["Venoa", "Zeeland"],
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3);
  });

  it("only one republic heretic, heretic player, no influence — 1 supporting → floor(3 * 0.5) = 1 gold", () => {
    // Zeeland is heretic (slot 4), Venoa is orthodox (slot 5).
    // Heretic player matches Zeeland only → 1 supporting.
    // baseMercy = 3, mercyGold = floor(3 * 0.5) = 1.
    const G = buildTwoPlayerG({
      trailerAlignment: "heretic",
      nprHeretic: ["Zeeland"],
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(1);
  });

  it("slot 4 = Zeeland, slot 5 = Venoa — verify slots are not swapped", () => {
    // Only Zeeland is heretic. Heretic trailer, no influence.
    // If slots were swapped, Venoa (wrong slot) would be counted instead of Zeeland.
    // Correct: Zeeland is heretic → heretic player gets 1 support from Zeeland (slot 4).
    // We confirm gold = 1, not 0 (no support) or 3 (both support).
    const G = buildTwoPlayerG({
      trailerAlignment: "heretic",
      nprHeretic: ["Zeeland"],  // only Zeeland turns heretic (slot 4)
      trailerGold: 10,
    });

    calculateMercy(G);

    // 1 supporting → floor(3 * 0.5) = 1 gold added
    expect(G.playerInfo["1"].resources.gold).toBe(11);
  });
});

// ── Republic support — influence override ─────────────────────────────────────

describe("calculateMercy — republic support via influence (overrides alignment)", () => {
  it("heretic player with Venoa influence (slot 5) — 1 supporting → floor(baseMercy * 0.5)", () => {
    // Both republics are orthodox; player is heretic → alignment mismatch.
    // But player "1" has influence at prelate slot 5 (Venoa) → Venoa supports anyway.
    // gap 9, baseMercy 3 → floor(3 * 0.5) = 1 gold.
    const G = buildTwoPlayerG({
      trailerAlignment: "heretic",
      nprHeretic: [],
      influencePrelates: { 5: "1" },
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(1);
  });

  it("heretic player with both Venoa (slot 5) and Zeeland (slot 4) influence — 2 supporting → full baseMercy", () => {
    // Both republics orthodox → alignment mismatch.
    // But player has influence at both slots → both support → full baseMercy = 3.
    const G = buildTwoPlayerG({
      trailerAlignment: "heretic",
      nprHeretic: [],
      influencePrelates: { 4: "1", 5: "1" },
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3);
  });

  it("orthodox player with heretic republic but influence in that slot — still counts as supporting", () => {
    // Venoa turns heretic → alignment mismatch for orthodox player.
    // But orthodox player has influence at Venoa slot 5 → Venoa still supports.
    // Zeeland is orthodox → alignment matches → also supports.
    // 2 supporting → full baseMercy = 3.
    const G = buildTwoPlayerG({
      trailerAlignment: "orthodox",
      nprHeretic: ["Venoa"],
      influencePrelates: { 5: "1" },
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3);
  });

  it("influence in slot 4 (Zeeland) helps orthodox player when Zeeland turns heretic", () => {
    // Zeeland turns heretic → mismatch for orthodox player.
    // Player has influence at slot 4 (Zeeland) → Zeeland still supports.
    // Venoa is orthodox → alignment match → also supports.
    // 2 supporting → full baseMercy = 3.
    const G = buildTwoPlayerG({
      trailerAlignment: "orthodox",
      nprHeretic: ["Zeeland"],
      influencePrelates: { 4: "1" },
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3);
  });
});

// ── Half-mercy rounding ────────────────────────────────────────────────────────

describe("calculateMercy — rounding with 1 supporting republic", () => {
  it("baseMercy = 5 with 1 supporting → floor(5 * 0.5) = 2, not 2.5", () => {
    // gap 15 → floor(15/3) = 5. 1 supporting republic → floor(5 * 0.5) = 2.
    const G = buildTwoPlayerG({
      leaderVP: 30,
      trailerVP: 15,
      trailerAlignment: "heretic",
      nprHeretic: ["Venoa"], // only Venoa matches heretic player
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(2); // floor, not ceiling
  });

  it("baseMercy = 1 with 1 supporting → floor(1 * 0.5) = 0, not 1", () => {
    // gap 3 → baseMercy 1. 1 supporting → floor(0.5) = 0 → no gold added.
    // The if (mercyGold > 0) guard prevents spurious log entries.
    const G = buildTwoPlayerG({
      leaderVP: 13,
      trailerVP: 10,
      trailerAlignment: "heretic",
      nprHeretic: ["Venoa"], // 1 match
      trailerGold: 7,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(7); // unchanged — 0 mercy
  });
});

// ── Gold arithmetic edge cases ────────────────────────────────────────────────

describe("calculateMercy — gold arithmetic edge cases", () => {
  it("player with negative gold (debt) receives mercy correctly", () => {
    // Player starts at -5 gold (debt). Gap 9 → baseMercy 3, 2 supporting → +3 gold.
    // -5 + 3 = -2.
    const G = buildTwoPlayerG({
      trailerAlignment: "orthodox",
      nprHeretic: [],
      trailerGold: -5,
    });

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(-2);
  });

  it("leader gold is unaffected even when trailing players receive mercy", () => {
    const G = buildTwoPlayerG({
      trailerAlignment: "orthodox",
      leaderGold: 10,
      trailerGold: 0,
    });

    calculateMercy(G);

    expect(G.playerInfo["0"].resources.gold).toBe(10); // untouched
  });
});

// ── Multiple trailing players ─────────────────────────────────────────────────

describe("calculateMercy — multiple trailing players", () => {
  it("each trailing player gets their own independent mercy calculation", () => {
    // Player "0": leader at 30 VP.
    // Player "1": 21 VP → gap 9, baseMercy 3.
    // Player "2": 15 VP → gap 15, baseMercy 5.
    // Player "3": 28 VP → gap 2, baseMercy 0 → skipped.
    // All players orthodox, both republics orthodox → 2 supporting for players who qualify.
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ victoryPoints: 30, gold: 0 }) }),
      buildPlayer("1", { resources: buildResources({ victoryPoints: 21, gold: 0 }) }),
      buildPlayer("2", { resources: buildResources({ victoryPoints: 15, gold: 0 }) }),
      buildPlayer("3", { resources: buildResources({ victoryPoints: 28, gold: 0 }) }),
    ]);
    // All orthodox (default), both republics orthodox (nprHeretic empty by default)

    calculateMercy(G);

    expect(G.playerInfo["0"].resources.gold).toBe(0); // leader — no mercy
    expect(G.playerInfo["1"].resources.gold).toBe(3); // baseMercy 3, 2 supporting
    expect(G.playerInfo["2"].resources.gold).toBe(5); // baseMercy 5, 2 supporting
    expect(G.playerInfo["3"].resources.gold).toBe(0); // gap 2 → baseMercy 0, skipped
  });

  it("influence for one player does not bleed into another player's calculation", () => {
    // Player "1" is heretic with Venoa influence (slot 5) → 1 supporting → floor(3*0.5) = 1.
    // Player "2" is heretic with no influence → 0 supporting → 0 gold.
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ victoryPoints: 30, gold: 0 }) }),
      buildPlayer("1", {
        hereticOrOrthodox: "heretic",
        resources: buildResources({ victoryPoints: 21, gold: 0 }),
      }),
      buildPlayer("2", {
        hereticOrOrthodox: "heretic",
        resources: buildResources({ victoryPoints: 21, gold: 0 }),
      }),
    ]);
    G.eventState.nprHeretic = []; // both republics orthodox → mismatch for heretics
    G.boardState.influencePrelates = {
      ...G.boardState.influencePrelates,
      5: "1", // only player "1" has Venoa influence
    };

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(1); // 1 supporting via influence
    expect(G.playerInfo["2"].resources.gold).toBe(0); // no support at all
  });

  it("tied players at the same non-leader VP each receive mercy independently", () => {
    // Two players tied at 21 VP. Leader at 30. Both orthodox → each gets full baseMercy 3.
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ victoryPoints: 30, gold: 0 }) }),
      buildPlayer("1", { resources: buildResources({ victoryPoints: 21, gold: 0 }) }),
      buildPlayer("2", { resources: buildResources({ victoryPoints: 21, gold: 0 }) }),
    ]);
    // orthodox (default), both republics orthodox

    calculateMercy(G);

    expect(G.playerInfo["1"].resources.gold).toBe(3);
    expect(G.playerInfo["2"].resources.gold).toBe(3);
  });
});
