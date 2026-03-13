/**
 * passFleetInfoToPlayerInfo.test.ts
 *
 * Tests for the passFleetInfoToPlayerInfo move.
 *
 * Source logic (fleet must be at reserve position [4,0]):
 *   - args: (fleetId, skyshipCount, regimentCount, levyCount)
 *   - Returns INVALID_MOVE if fleetId !== fleet.fleetId (ID mismatch)
 *   - Returns INVALID_MOVE if fleet is not at reserve [4,0]
 *   - Returns INVALID_MOVE if player lacks the requested resources
 *   - Otherwise: sets fleet.skyships/regiments/levies, deducts from player resources,
 *     sets turnComplete = true
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import passFleetInfoToPlayerInfo from "../../moves/actions/passFleetInfoToPlayerInfo";
import { buildInitialG, buildPlayer, buildFleet, buildResources, buildCtx } from "../testHelpers";

describe("passFleetInfoToPlayerInfo — successful load", () => {
  it("sets fleet units and deducts from player resources", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ skyships: 5, regiments: 6, levies: 3 }),
        fleetInfo: [buildFleet(0, { location: [4, 0], skyships: 0, regiments: 0, levies: 0 })],
      }),
    ]);
    const ctx = buildCtx("0");

    (passFleetInfoToPlayerInfo as Function)({ G, ctx, playerID: "0" }, 0, 3, 2, 1);

    expect(G.playerInfo["0"].fleetInfo[0].skyships).toBe(3);
    expect(G.playerInfo["0"].fleetInfo[0].regiments).toBe(2);
    expect(G.playerInfo["0"].fleetInfo[0].levies).toBe(1);
    expect(G.playerInfo["0"].resources.skyships).toBe(2);
    expect(G.playerInfo["0"].resources.regiments).toBe(4);
    expect(G.playerInfo["0"].resources.levies).toBe(2);
  });

  it("sets turnComplete=true on success", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ skyships: 3, regiments: 3, levies: 0 }),
        fleetInfo: [buildFleet(0, { location: [4, 0], skyships: 0, regiments: 0, levies: 0 })],
      }),
    ]);
    const ctx = buildCtx("0");

    (passFleetInfoToPlayerInfo as Function)({ G, ctx, playerID: "0" }, 0, 1, 0, 0);

    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("passFleetInfoToPlayerInfo — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when fleet ID does not match", () => {
    // Fleet is at index 0 but has fleetId=99; passing fleetId=0 triggers mismatch
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [buildFleet(99, { location: [4, 0] })],
      }),
    ]);
    const ctx = buildCtx("0");

    const result = (passFleetInfoToPlayerInfo as Function)({ G, ctx, playerID: "0" }, 0, 1, 0, 0);

    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when fleet index is out of bounds", () => {
    // Player only has fleet at index 0; passing fleetId=5 → fleetInfo[5] is undefined
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [buildFleet(0, { location: [4, 0] })],
      }),
    ]);
    const ctx = buildCtx("0");

    const result = (passFleetInfoToPlayerInfo as Function)({ G, ctx, playerID: "0" }, 5, 1, 0, 0);

    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when fleet is not at reserve position", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ skyships: 5 }),
        fleetInfo: [buildFleet(0, { location: [2, 2] })], // not at [4,0]
      }),
    ]);
    const ctx = buildCtx("0");

    const result = (passFleetInfoToPlayerInfo as Function)({ G, ctx, playerID: "0" }, 0, 2, 0, 0);

    // move does nothing when fleet not at reserve — turnComplete stays false, result undefined
    expect(G.playerInfo["0"].turnComplete).toBe(false);
    expect(result).toBeUndefined();
  });

  it("returns INVALID_MOVE when player has fewer skyships than requested", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ skyships: 1 }),
        fleetInfo: [buildFleet(0, { location: [4, 0] })],
      }),
    ]);
    const ctx = buildCtx("0");

    const result = (passFleetInfoToPlayerInfo as Function)({ G, ctx, playerID: "0" }, 0, 5, 0, 0);

    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has fewer regiments than requested", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ skyships: 3, regiments: 1 }),
        fleetInfo: [buildFleet(0, { location: [4, 0] })],
      }),
    ]);
    const ctx = buildCtx("0");

    const result = (passFleetInfoToPlayerInfo as Function)({ G, ctx, playerID: "0" }, 0, 0, 3, 0);

    expect(result).toBe(INVALID_MOVE);
  });
});
