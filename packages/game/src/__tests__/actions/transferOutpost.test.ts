/**
 * transferOutpost.test.ts
 *
 * Tests for transferOutpost (v4.2 Anytime Option).
 *
 * Rules:
 *   Transfer an Outpost or Colony to another player whose Fleet is present at that tile.
 *   Free action — no counsellor cost, no turnComplete.
 *
 *   INVALID_MOVE if:
 *     - Transfer to self
 *     - Target player doesn't exist
 *     - Invalid tile coordinates
 *     - Player doesn't own an outpost/colony at that tile
 *     - Target player has no fleet at that tile
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import transferOutpost from "../../moves/actions/transferOutpost";
import { buildInitialG, buildPlayer, buildFleet } from "../testHelpers";
import { MapBuildingInfo, PlayerInfo } from "../../types";

function callMove(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  tileCoords: [number, number],
  targetPlayerID: string
) {
  return (transferOutpost as Function)({ G, playerID }, tileCoords, targetPlayerID);
}

function buildMapWithBuilding(
  player: PlayerInfo,
  buildingType: "outpost" | "colony",
  coords: [number, number]
): MapBuildingInfo[][] {
  const emptyCell: MapBuildingInfo = { fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
  // Create a 5x3 grid
  const grid: MapBuildingInfo[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => ({ ...emptyCell }))
  );
  const [x, y] = coords;
  grid[y][x] = { player, buildings: buildingType, fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
  return grid;
}

describe("transferOutpost — successful transfer", () => {
  it("transfers an outpost to the target player", () => {
    const p0 = buildPlayer("0", {
      fleetInfo: [buildFleet(0, { location: [2, 1], skyships: 3 })],
    });
    const p1 = buildPlayer("1", {
      fleetInfo: [buildFleet(0, { location: [2, 1], skyships: 2 })],
    });
    const G = buildInitialG([p0, p1], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p0, "outpost", [2, 1]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });

    callMove(G, "0", [2, 1], "1");
    expect(G.mapState.buildings[1][2].player?.id).toBe("1");
  });

  it("transfers a colony to the target player", () => {
    const p0 = buildPlayer("0");
    const p1 = buildPlayer("1", {
      fleetInfo: [buildFleet(0, { location: [3, 0], skyships: 1 })],
    });
    const G = buildInitialG([p0, p1], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p0, "colony", [3, 0]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });

    callMove(G, "0", [3, 0], "1");
    expect(G.mapState.buildings[0][3].player?.id).toBe("1");
  });

  it("does not set turnComplete", () => {
    const p0 = buildPlayer("0");
    const p1 = buildPlayer("1", {
      fleetInfo: [buildFleet(0, { location: [2, 1], skyships: 1 })],
    });
    const G = buildInitialG([p0, p1], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p0, "outpost", [2, 1]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });

    callMove(G, "0", [2, 1], "1");
    expect(G.playerInfo["0"].turnComplete).toBe(false);
  });
});

describe("transferOutpost — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when transferring to self", () => {
    const p0 = buildPlayer("0");
    const G = buildInitialG([p0, buildPlayer("1")], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p0, "outpost", [2, 1]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });
    expect(callMove(G, "0", [2, 1], "0")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when target player doesn't exist", () => {
    const p0 = buildPlayer("0");
    const G = buildInitialG([p0, buildPlayer("1")], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p0, "outpost", [2, 1]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });
    expect(callMove(G, "0", [2, 1], "99")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player doesn't own building at tile", () => {
    const p0 = buildPlayer("0");
    const p1 = buildPlayer("1", {
      fleetInfo: [buildFleet(0, { location: [2, 1], skyships: 1 })],
    });
    // Building owned by p1, not p0
    const G = buildInitialG([p0, p1], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p1, "outpost", [2, 1]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });
    expect(callMove(G, "0", [2, 1], "1")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when target player has no fleet at tile", () => {
    const p0 = buildPlayer("0");
    const p1 = buildPlayer("1", {
      fleetInfo: [buildFleet(0, { location: [0, 0], skyships: 1 })], // fleet elsewhere
    });
    const G = buildInitialG([p0, p1], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p0, "outpost", [2, 1]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });
    expect(callMove(G, "0", [2, 1], "1")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when target fleet has 0 skyships at tile", () => {
    const p0 = buildPlayer("0");
    const p1 = buildPlayer("1", {
      fleetInfo: [buildFleet(0, { location: [2, 1], skyships: 0 })], // empty fleet
    });
    const G = buildInitialG([p0, p1], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p0, "outpost", [2, 1]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });
    expect(callMove(G, "0", [2, 1], "1")).toBe(INVALID_MOVE);
  });
});
