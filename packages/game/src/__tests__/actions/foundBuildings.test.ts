/**
 * foundBuildings.test.ts
 *
 * Tests for foundBuildings (v4.2, B11).
 *
 * Building costs (v4.2):
 *   Cathedral: 5 Gold base + 1 per previous cathedral built this round
 *              (orthodox only, +2 VP, heresy tracker −1)
 *   Palace:    5 Gold base + 1 per previous palace built this round
 *              (+2 VP for heretics, +1 VP for orthodox)
 *   Shipyard:  3 Gold base + 1 per previous shipyard built this round
 *   Fort:      2 Gold flat + 2 counsellors total (1 extra + 1 placed)
 *
 * All buildings: cost 1 counsellor (except fort = 2), mark turnComplete
 * INVALID_MOVE if: 0 counsellors, at max (cathedrals/palaces = 6, shipyards = 3),
 *   fort requires ≥ 2 counsellors and ≥ 2 Gold
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import foundBuildings from "../../moves/actions/foundBuildings";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";

// slotIndex: 0 = Cathedral, 1 = Palace, 2 = Shipyard, 3 = Fort
function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, slotIndex: number, extraArg?: any) {
  const ctx = buildCtx(playerID);
  return (foundBuildings as Function)({ G, ctx, playerID }, slotIndex, extraArg);
}

// ── Cathedral (slot 0) ─────────────────────────────────────────────────────

describe("foundBuildings — Cathedral (v4.2: 5 Gold base)", () => {
  it("first cathedral this round costs 5 Gold", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.gold).toBe(5);
  });

  it("second cathedral costs 6 Gold (5 base + 1 for prior)", () => {
    const G = buildInitialG([buildPlayer("0", { resources: buildResources({ gold: 20 }) })]);
    G.boardState.foundBuildings[1].push("1"); // one already taken this round
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.gold).toBe(14); // 20 - 6
  });

  it("increments the player's cathedral count", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    const before = G.playerInfo["0"].cathedrals;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].cathedrals).toBe(before + 1);
  });

  it("grants +2 VP", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 2);
  });

  it("moves heresyTracker toward orthodoxy by 1", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    G.playerInfo["0"].heresyTracker = 9;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].heresyTracker).toBe(8);
  });

  it("consumes 1 counsellor", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    const before = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 0);
    expect(G.playerInfo["0"].resources.counsellors).toBe(before - 1);
  });

  it("returns INVALID_MOVE for heretic players", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "heretic", resources: buildResources({ gold: 10 }) })]);
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when already at 6 cathedrals", () => {
    const G = buildInitialG([buildPlayer("0", { cathedrals: 6, resources: buildResources({ gold: 10 }) })]);
    const result = callMove(G, "0", 0);
    expect(result).toBe(INVALID_MOVE);
  });
});

// ── Palace (slot 1) ──────────────────────────────────────────────────────────

describe("foundBuildings — Palace (v4.2: 5 Gold base)", () => {
  it("first palace costs 5 Gold", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    callMove(G, "0", 1, "advance");
    expect(G.playerInfo["0"].resources.gold).toBe(5);
  });

  it("orthodox player gains +1 VP", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "orthodox", resources: buildResources({ gold: 10 }) })]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    callMove(G, "0", 1, "advance");
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 1);
  });

  it("heretic player gains +2 VP", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "heretic", resources: buildResources({ gold: 10 }) })]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    callMove(G, "0", 1, "advance");
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 2);
  });

  it("returns INVALID_MOVE when already at 6 palaces", () => {
    const G = buildInitialG([buildPlayer("0", { palaces: 6, resources: buildResources({ gold: 10 }) })]);
    const result = callMove(G, "0", 1, "advance");
    expect(result).toBe(INVALID_MOVE);
  });
});

// ── Shipyard (slot 2) ─────────────────────────────────────────────────────────

describe("foundBuildings — Shipyard (3 Gold base)", () => {
  it("first shipyard costs 3 Gold", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    callMove(G, "0", 2);
    expect(G.playerInfo["0"].resources.gold).toBe(7);
  });

  it("increments the player's shipyard count", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    const before = G.playerInfo["0"].shipyards;
    callMove(G, "0", 2);
    expect(G.playerInfo["0"].shipyards).toBe(before + 1);
  });

  it("returns INVALID_MOVE when already at 3 shipyards", () => {
    const G = buildInitialG([buildPlayer("0", { shipyards: 3, resources: buildResources({ gold: 10 }) })]);
    const result = callMove(G, "0", 2);
    expect(result).toBe(INVALID_MOVE);
  });
});

// ── Fort (slot 3) ─────────────────────────────────────────────────────────────

describe("foundBuildings — Fort (v4.2: 2 Gold + 2 counsellors)", () => {
  it("costs 2 Gold", () => {
    const G = buildInitialG();
    const goldBefore = G.playerInfo["0"].resources.gold;
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 2);
  });

  it("costs 2 counsellors (1 extra + 1 placed)", () => {
    const G = buildInitialG();
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore - 2);
  });

  it("does NOT mark turnComplete (placement continues in a sub-stage)", () => {
    const G = buildInitialG();
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].turnComplete).toBe(false);
  });

  it("returns INVALID_MOVE when player has < 2 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 1 }) }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has < 2 Gold", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 1 }) }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });
});

// ── General ───────────────────────────────────────────────────────────────────

describe("foundBuildings — general rules", () => {
  it("returns INVALID_MOVE when player has 0 counsellors (for non-fort buildings)", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 0, gold: 10 }) }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0", 0); // cathedral
    expect(result).toBe(INVALID_MOVE);
  });

  it("records the player in the foundBuildings slot array", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.gold = 10;
    callMove(G, "0", 0); // cathedral
    expect(G.boardState.foundBuildings[1]).toContain("0");
  });
});