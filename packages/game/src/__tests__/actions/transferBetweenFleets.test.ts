/**
 * transferBetweenFleets.test.ts
 *
 * Tests for transferBetweenFleets (v4.2).
 *
 * Rules:
 *   Two fleets at the same map square may transfer Skyships, Regiments,
 *   and Levies between them. No counsellor cost, no turnComplete.
 *
 *   INVALID_MOVE if:
 *     - Same fleet index
 *     - Fleets at different locations
 *     - Fleets at Kingdom [4,0]
 *     - Source lacks resources
 *     - Target would exceed 5 Skyships
 *     - Target troops would exceed target Skyships
 *     - Source troops would exceed source Skyships after transfer
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import transferBetweenFleets from "../../moves/actions/transferBetweenFleets";
import { buildInitialG, buildPlayer, buildFleet, callMoveDef } from "../testHelpers";

function callMove(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  sourceIndex: number,
  targetIndex: number,
  skyships: number,
  regiments: number,
  levies: number
) {
  return callMoveDef(transferBetweenFleets, G, playerID, sourceIndex, targetIndex, skyships, regiments, levies).result;
}

describe("transferBetweenFleets — successful transfer", () => {
  it("moves skyships from source to target", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 4, regiments: 0, levies: 0 }),
          buildFleet(1, { location: [2, 1], skyships: 1, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    callMove(G, "0", 0, 1, 2, 0, 0);
    expect(G.playerInfo["0"].fleetInfo[0].skyships).toBe(2);
    expect(G.playerInfo["0"].fleetInfo[1].skyships).toBe(3);
  });

  it("moves regiments and levies from source to target", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 3, regiments: 2, levies: 1 }),
          buildFleet(1, { location: [2, 1], skyships: 3, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    callMove(G, "0", 0, 1, 0, 1, 1);
    expect(G.playerInfo["0"].fleetInfo[0].regiments).toBe(1);
    expect(G.playerInfo["0"].fleetInfo[0].levies).toBe(0);
    expect(G.playerInfo["0"].fleetInfo[1].regiments).toBe(1);
    expect(G.playerInfo["0"].fleetInfo[1].levies).toBe(1);
  });

  it("does not set turnComplete", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 3, regiments: 0, levies: 0 }),
          buildFleet(1, { location: [2, 1], skyships: 1, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    callMove(G, "0", 0, 1, 1, 0, 0);
    expect(G.playerInfo["0"].turnComplete).toBe(false);
  });
});

describe("transferBetweenFleets — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when transferring to same fleet", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 3, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    expect(callMove(G, "0", 0, 0, 1, 0, 0)).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when fleets are at different locations", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 3, regiments: 0, levies: 0 }),
          buildFleet(1, { location: [3, 1], skyships: 1, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    expect(callMove(G, "0", 0, 1, 1, 0, 0)).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when fleets are at Kingdom [4,0]", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [4, 0], skyships: 3, regiments: 0, levies: 0 }),
          buildFleet(1, { location: [4, 0], skyships: 1, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    expect(callMove(G, "0", 0, 1, 1, 0, 0)).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when source lacks skyships", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 1, regiments: 0, levies: 0 }),
          buildFleet(1, { location: [2, 1], skyships: 1, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    expect(callMove(G, "0", 0, 1, 3, 0, 0)).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when target would exceed 5 skyships", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 3, regiments: 0, levies: 0 }),
          buildFleet(1, { location: [2, 1], skyships: 4, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    expect(callMove(G, "0", 0, 1, 2, 0, 0)).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when target troops would exceed target skyships", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 3, regiments: 2, levies: 0 }),
          buildFleet(1, { location: [2, 1], skyships: 2, regiments: 2, levies: 0 }),
        ],
      }),
    ]);
    // Trying to move 1 regiment to target: target would have 3 troops but only 2 skyships
    expect(callMove(G, "0", 0, 1, 0, 1, 0)).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when source troops would exceed source skyships", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, { location: [2, 1], skyships: 3, regiments: 3, levies: 0 }),
          buildFleet(1, { location: [2, 1], skyships: 3, regiments: 0, levies: 0 }),
        ],
      }),
    ]);
    // Moving 2 skyships out: source would have 1 skyship but 3 regiments
    expect(callMove(G, "0", 0, 1, 2, 0, 0)).toBe(INVALID_MOVE);
  });
});
