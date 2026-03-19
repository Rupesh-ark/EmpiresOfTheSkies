/**
 * checkAndPlaceFort.test.ts
 *
 * Tests for the checkAndPlaceFort move.
 *
 * Source logic:
 *   - Takes coords [x, y] and checks G.mapState.buildings[y][x]
 *   - Returns INVALID_MOVE if tile is undefined
 *   - Returns INVALID_MOVE if the player does not have a colony or outpost on the tile,
 *     or the tile already has a fort, or there are no garrisoned regiments
 *   - Otherwise sets tileInfo.fort = true and player.turnComplete = true
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import checkAndPlaceFort from "../../moves/actions/checkAndPlaceFort";
import { buildInitialG, buildPlayer, callMoveDef } from "../testHelpers";
import type { MapBuildingInfo } from "../../types";

function buildMap(): MapBuildingInfo[][] {
  const emptyTile: MapBuildingInfo = {
    fort: false,
    garrisonedRegiments: 0,
    garrisonedLevies: 0,
    garrisonedEliteRegiments: 0,
  };
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 8 }, () => ({ ...emptyTile }))
  );
}

describe("checkAndPlaceFort — success", () => {
  it("places a fort and sets turnComplete when all conditions are met", () => {
    const G = buildInitialG([buildPlayer("0")]);
    const buildings = buildMap();
    buildings[0][0] = {
      player: G.playerInfo["0"],
      buildings: "colony",
      fort: false,
      garrisonedRegiments: 2,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    };
    G.mapState.buildings = buildings;

    callMoveDef(checkAndPlaceFort, G, "0", [0, 0]);

    expect(G.mapState.buildings[0][0].fort).toBe(true);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });

  it("also places a fort when the player has an outpost (not just colony)", () => {
    const G = buildInitialG([buildPlayer("0")]);
    const buildings = buildMap();
    buildings[1][2] = {
      player: G.playerInfo["0"],
      buildings: "outpost",
      fort: false,
      garrisonedRegiments: 1,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    };
    G.mapState.buildings = buildings;

    callMoveDef(checkAndPlaceFort, G, "0", [2, 1]);

    expect(G.mapState.buildings[1][2].fort).toBe(true);
  });
});

describe("checkAndPlaceFort — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when tile coords are out of range", () => {
    // buildings[0][99] is undefined — triggers the tileInfo === undefined guard
    const G = buildInitialG([buildPlayer("0")]);
    G.mapState.buildings = buildMap();

    const { result } = callMoveDef(checkAndPlaceFort, G, "0", [99, 0]);

    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when tile has no player presence", () => {
    const G = buildInitialG([buildPlayer("0")]);
    const buildings = buildMap();
    // tile has no player property
    G.mapState.buildings = buildings;

    const { result } = callMoveDef(checkAndPlaceFort, G, "0", [0, 0]);

    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when the tile belongs to a different player", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const buildings = buildMap();
    buildings[0][0] = {
      player: G.playerInfo["1"],
      buildings: "colony",
      fort: false,
      garrisonedRegiments: 2,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    };
    G.mapState.buildings = buildings;

    const { result } = callMoveDef(checkAndPlaceFort, G, "0", [0, 0]);

    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when a fort is already placed", () => {
    const G = buildInitialG([buildPlayer("0")]);
    const buildings = buildMap();
    buildings[0][0] = {
      player: G.playerInfo["0"],
      buildings: "colony",
      fort: true, // already fortified
      garrisonedRegiments: 2,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    };
    G.mapState.buildings = buildings;

    const { result } = callMoveDef(checkAndPlaceFort, G, "0", [0, 0]);

    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when garrisonedRegiments is 0", () => {
    const G = buildInitialG([buildPlayer("0")]);
    const buildings = buildMap();
    buildings[0][0] = {
      player: G.playerInfo["0"],
      buildings: "colony",
      fort: false,
      garrisonedRegiments: 0, // no troops
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    };
    G.mapState.buildings = buildings;

    const { result } = callMoveDef(checkAndPlaceFort, G, "0", [0, 0]);

    expect(result).toBe(INVALID_MOVE);
  });
});
