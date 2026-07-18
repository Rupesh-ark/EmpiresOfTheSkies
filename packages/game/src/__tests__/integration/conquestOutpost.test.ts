/**
 * conquestOutpost.test.ts (integration)
 *
 * Regression tests for establishing outposts during the conquest stage.
 * Covers:
 *   1. Map setup must give each tile its own building object.
 *   2. constructOutpost must succeed on unclaimed lands.
 *   3. constructOutpost must fail when another player owns the tile.
 *   4. Claiming one tile in a row must not affect neighbouring tiles.
 */

import { describe, it, expect } from "vitest";
import { MOVE_DEFINITIONS } from "../../moveDefinitions.js";
import { getInitialOutpostsAndColoniesInfo } from "../../setup/mapSetup.js";
import {
  buildInitialG,
  buildPlayer,
  callMoveDef,
  buildFleet,
} from "../testHelpers.js";
import type { MyGameState } from "../../types.js";

const EMPTY_LOOT = {
  gold: 0,
  mithril: 0,
  dragonScales: 0,
  krakenSkin: 0,
  magicDust: 0,
  stickyIchor: 0,
  pipeweed: 0,
  victoryPoints: 0,
};

function buildConquestG(): MyGameState {
  const G = buildInitialG([
    buildPlayer("0", {
      fleetInfo: [buildFleet(0, { location: [2, 2], skyships: 3, regiments: 2 })],
    }),
    buildPlayer("1"),
  ]);

  G.stage = { phase: "resolution", sub: "conquest" };
  G.mapState.currentBattle = [2, 2];
  G.mapState.discoveredTiles[2][2] = true;
  G.mapState.battleMap[2][2] = ["0"];
  G.mapState.currentTileArray[2][2] = {
    name: "TestLand",
    blocked: [],
    sword: 2,
    shield: 0,
    type: "land",
    loot: { outpost: { ...EMPTY_LOOT }, colony: { ...EMPTY_LOOT } },
  };
  // Ensure the building is a fresh, unclaimed object
  G.mapState.buildings[2][2] = {
    garrisonedLevies: 0,
    garrisonedRegiments: 0,
    garrisonedEliteRegiments: 0,
    fort: [],
  };

  return G;
}

describe("conquest outpost — map setup gives each tile a distinct building object", () => {
  it("does not share building references within a row", () => {
    const buildings = getInitialOutpostsAndColoniesInfo();
    buildings[0][0].garrisonedRegiments = 99;
    expect(buildings[0][1].garrisonedRegiments).toBe(0);
  });

  it("does not share building references across rows", () => {
    const buildings = getInitialOutpostsAndColoniesInfo();
    buildings[0][0].garrisonedRegiments = 99;
    expect(buildings[1][0].garrisonedRegiments).toBe(0);
  });
});

describe("conquest outpost — constructOutpost validation", () => {
  it("succeeds on an unclaimed land where the player has a fleet", () => {
    const G = buildConquestG();
    const { result } = callMoveDef(MOVE_DEFINITIONS.constructOutpost, G, "0");

    expect(result).not.toBe("INVALID_MOVE");
    expect(G.mapState.buildings[2][2].buildings).toBe("outpost");
    expect(G.mapState.buildings[2][2].player?.id).toBe("0");
    expect(G.stage).toEqual({ phase: "resolution", sub: "conquest_garrison" });
  });

  it("fails when another player already owns the tile", () => {
    const G = buildConquestG();
    G.mapState.buildings[2][2].player = G.playerInfo["1"];

    const { result } = callMoveDef(MOVE_DEFINITIONS.constructOutpost, G, "0");
    expect(result).toBe("INVALID_MOVE");
  });

  it("does not treat a claim in the same row as ownership of the target tile", () => {
    const G = buildConquestG();

    // Player 0 also has a fleet at [3,2] and claims it first.
    G.mapState.discoveredTiles[2][3] = true;
    G.mapState.battleMap[2][3] = ["0"];
    G.mapState.currentTileArray[2][3] = {
      name: "OtherLand",
      blocked: [],
      sword: 1,
      shield: 0,
      type: "land",
      loot: { outpost: { ...EMPTY_LOOT }, colony: { ...EMPTY_LOOT } },
    };
    G.mapState.currentBattle = [3, 2];

    const firstClaim = callMoveDef(MOVE_DEFINITIONS.constructOutpost, G, "0");
    expect(firstClaim.result).not.toBe("INVALID_MOVE");
    expect(G.mapState.buildings[2][3].player?.id).toBe("0");

    // Reset state to claim the original target [2,2] in a separate conquest step.
    G.mapState.currentBattle = [2, 2];
    G.stage = { phase: "resolution", sub: "conquest" };
    G.playerInfo["0"].turnComplete = false;

    const secondClaim = callMoveDef(MOVE_DEFINITIONS.constructOutpost, G, "0");
    expect(secondClaim.result).not.toBe("INVALID_MOVE");
    expect(G.mapState.buildings[2][2].player?.id).toBe("0");
    // Ensure the first claim's tile was not overwritten by the second.
    expect(G.mapState.buildings[2][3].player?.id).toBe("0");
    expect(G.mapState.buildings[2][3].buildings).toBe("outpost");
  });
});
