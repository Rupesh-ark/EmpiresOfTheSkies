/**
 * buildSkyships.test.ts
 *
 * Tests for the buildSkyships move (v4.2).
 *
 * Rules:
 *   - Cost = 2 * shipyards Gold
 *   - Gains 2 * shipyards skyships
 *   - Consumes 1 counsellor
 *   - Sets playerBoardCounsellorLocations.buildSkyships = true
 *   - Marks turnComplete = true
 *   - INVALID_MOVE if: 0 counsellors, 0 shipyards, or buildSkyships already used
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import buildSkyships from "../../moves/actions/buildSkyships";
import {
  buildInitialG,
  buildPlayer,
  buildCtx,
  buildResources,
  buildPlayerBoard,
} from "../testHelpers";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, perShipyard = 2) {
  const ctx = buildCtx(playerID);
  return buildSkyships.fn({ G, ctx, playerID }, perShipyard);
}

// ── Gold cost ─────────────────────────────────────────────────────────────────

describe("buildSkyships — gold cost", () => {
  it("costs 2 Gold when the player has 1 shipyard", () => {
    const G = buildInitialG([
      buildPlayer("0", { shipyards: 1 }),
      buildPlayer("1"),
    ]);
    const goldBefore = G.playerInfo["0"].resources.gold; // 6
    callMove(G, "0");
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 2);
  });

  it("costs 4 Gold when the player has 2 shipyards", () => {
    const G = buildInitialG([
      buildPlayer("0", { shipyards: 2 }),
      buildPlayer("1"),
    ]);
    const goldBefore = G.playerInfo["0"].resources.gold; // 6
    callMove(G, "0");
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 4);
  });
});

// ── Skyship gain ──────────────────────────────────────────────────────────────

describe("buildSkyships — skyship gain", () => {
  it("grants 2 skyships when the player has 1 shipyard", () => {
    const G = buildInitialG([
      buildPlayer("0", { shipyards: 1 }),
      buildPlayer("1"),
    ]);
    const shipsBefore = G.playerInfo["0"].resources.skyships; // 3
    callMove(G, "0");
    expect(G.playerInfo["0"].resources.skyships).toBe(shipsBefore + 2);
  });

  it("grants 4 skyships when the player has 2 shipyards", () => {
    const G = buildInitialG([
      buildPlayer("0", { shipyards: 2 }),
      buildPlayer("1"),
    ]);
    const shipsBefore = G.playerInfo["0"].resources.skyships; // 3
    callMove(G, "0");
    expect(G.playerInfo["0"].resources.skyships).toBe(shipsBefore + 4);
  });
});

// ── Counsellor cost ───────────────────────────────────────────────────────────

describe("buildSkyships — counsellor cost", () => {
  it("consumes exactly 1 counsellor", () => {
    const G = buildInitialG([
      buildPlayer("0", { shipyards: 1 }),
      buildPlayer("1"),
    ]);
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors; // 4
    callMove(G, "0");
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore - 1);
  });
});

// ── Player-board state ────────────────────────────────────────────────────────

describe("buildSkyships — player board state", () => {
  it("sets playerBoardCounsellorLocations.buildSkyships to true", () => {
    const G = buildInitialG([
      buildPlayer("0", { shipyards: 1 }),
      buildPlayer("1"),
    ]);
    callMove(G, "0");
    expect(
      G.playerInfo["0"].playerBoardCounsellorLocations.buildSkyships
    ).toBe(true);
  });

  it("marks turnComplete for the acting player", () => {
    const G = buildInitialG([
      buildPlayer("0", { shipyards: 1 }),
      buildPlayer("1"),
    ]);
    callMove(G, "0");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

// ── INVALID_MOVE conditions ───────────────────────────────────────────────────

describe("buildSkyships — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        shipyards: 1,
        resources: buildResources({ counsellors: 0 }),
      }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has 0 shipyards", () => {
    const G = buildInitialG([
      buildPlayer("0", { shipyards: 0 }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when buildSkyships has already been used this turn", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        shipyards: 1,
        playerBoardCounsellorLocations: buildPlayerBoard({ buildSkyships: true }),
      }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0");
    expect(result).toBe(INVALID_MOVE);
  });
});