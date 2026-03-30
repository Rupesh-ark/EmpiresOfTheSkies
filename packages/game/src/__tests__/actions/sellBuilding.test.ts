/**
 * sellBuilding.test.ts
 *
 * Tests for sellBuilding (v4.2 Anytime Option).
 *
 * Rules:
 *   Sell Cathedral or Palace to bank for 3 Gold.
 *   Cannot sell last Palace.
 *   Only Heretics can sell Cathedrals.
 *   Free action — no counsellor cost, no turnComplete.
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import sellBuilding from "../../moves/actions/sellBuilding";
import { buildInitialG, buildPlayer, buildResources, callMoveDef } from "../testHelpers";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, buildingType: string) {
  return callMoveDef(sellBuilding, G, playerID, buildingType).result;
}

// ── Cathedral sales ──────────────────────────────────────────────────────────

describe("sellBuilding — Cathedral", () => {
  it("heretic player sells a cathedral for 3 Gold", () => {
    const G = buildInitialG([
      buildPlayer("0", { hereticOrOrthodox: "heretic", cathedrals: 2, resources: buildResources({ gold: 0 }) }),
    ]);
    callMove(G, "0", "cathedral");
    expect(G.playerInfo["0"].cathedrals).toBe(1);
    expect(G.playerInfo["0"].resources.gold).toBe(3);
  });

  it("does not set turnComplete", () => {
    const G = buildInitialG([
      buildPlayer("0", { hereticOrOrthodox: "heretic", cathedrals: 2 }),
    ]);
    callMove(G, "0", "cathedral");
    expect(G.playerInfo["0"].turnComplete).toBe(false);
  });

  it("does not cost a counsellor", () => {
    const G = buildInitialG([
      buildPlayer("0", { hereticOrOrthodox: "heretic", cathedrals: 2 }),
    ]);
    const before = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", "cathedral");
    expect(G.playerInfo["0"].resources.counsellors).toBe(before);
  });

  it("returns INVALID_MOVE when orthodox player tries to sell", () => {
    const G = buildInitialG([
      buildPlayer("0", { hereticOrOrthodox: "orthodox", cathedrals: 2 }),
    ]);
    expect(callMove(G, "0", "cathedral")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has 0 cathedrals", () => {
    const G = buildInitialG([
      buildPlayer("0", { hereticOrOrthodox: "heretic", cathedrals: 0 }),
    ]);
    expect(callMove(G, "0", "cathedral")).toBe(INVALID_MOVE);
  });
});

// ── Palace sales ─────────────────────────────────────────────────────────────

describe("sellBuilding — Palace", () => {
  it("sells a palace for 3 Gold when player has 2+", () => {
    const G = buildInitialG([
      buildPlayer("0", { palaces: 3, resources: buildResources({ gold: 0 }) }),
    ]);
    callMove(G, "0", "palace");
    expect(G.playerInfo["0"].palaces).toBe(2);
    expect(G.playerInfo["0"].resources.gold).toBe(3);
  });

  it("returns INVALID_MOVE when player has only 1 palace (cannot sell last)", () => {
    const G = buildInitialG([buildPlayer("0", { palaces: 1 })]);
    expect(callMove(G, "0", "palace")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has 0 palaces", () => {
    const G = buildInitialG([buildPlayer("0", { palaces: 0 })]);
    expect(callMove(G, "0", "palace")).toBe(INVALID_MOVE);
  });
});

// ── Invalid building type ────────────────────────────────────────────────────

describe("sellBuilding — invalid type", () => {
  it("returns INVALID_MOVE for unsupported building type", () => {
    const G = buildInitialG();
    expect(callMove(G, "0", "shipyard")).toBe(INVALID_MOVE);
  });
});
