/**
 * deployFleet.test.ts
 *
 * Tests for the deployFleet move (v4.2).
 *
 * Key rules:
 *   - Fleet must be at [4,0] (reserve) for resource checks to apply
 *   - skyshipCount === 0 → INVALID
 *   - 0 counsellors → INVALID
 *   - Destination must be reachable via findPossibleDestinations
 *   - Cost = 1G (1-hop), 2G (2-hop), 3G (3-hop)
 *   - Deducts 1 counsellor, sets turnComplete = true
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import deployFleet from "../../moves/actions/deployFleet";
import { buildInitialG, buildPlayer, buildCtx, buildFleet, buildResources } from "../testHelpers";

const stubEvents = { endTurn: (_args?: any) => {}, endPhase: () => {} } as any;

// ── Map helper ─────────────────────────────────────────────────────────────────
// Builds a full 4×8 map that findPossibleDestinations can traverse.
// All tiles are undiscovered except via the `discoveredTiles` array (all true).
function buildDeployMap() {
  const ROWS = 4, COLS = 8;
  const emptyLoot = {
    gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0,
    magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0,
  };
  const currentTileArray = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      name: "test",
      blocked: [] as string[],
      sword: 0,
      shield: 0,
      type: "land",
      loot: { outpost: emptyLoot, colony: emptyLoot },
    }))
  );
  const discoveredTiles: boolean[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(true)
  );
  const battleMap: string[][][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => [])
  );
  return { currentTileArray, discoveredTiles, battleMap };
}

// ── Test setup ─────────────────────────────────────────────────────────────────
// Fleet starts at reserve [4,0]. The W neighbour is [3,0] — 1 hop, costs 1 gold.
function buildDeployG(resourceOverrides: Partial<ReturnType<typeof buildResources>> = {}) {
  const G = buildInitialG([
    buildPlayer("0", {
      resources: buildResources({ skyships: 3, regiments: 6, levies: 0, gold: 6, counsellors: 4, ...resourceOverrides }),
      fleetInfo: [buildFleet(0, { location: [4, 0], skyships: 0, regiments: 0, levies: 0 })],
    }),
    buildPlayer("1"),
  ]);
  const map = buildDeployMap();
  G.mapState.currentTileArray = map.currentTileArray;
  G.mapState.discoveredTiles = map.discoveredTiles;
  G.mapState.battleMap = map.battleMap;
  // Player "0" is at the reserve position on the battleMap
  G.mapState.battleMap[0][4] = ["0"];
  return G;
}

// Calls deployFleet with the given args
function callDeploy(
  G: ReturnType<typeof buildInitialG>,
  fleetIndex: number,
  dest: [number, number],
  skyships: number,
  regiments: number,
  levies: number
) {
  const ctx = buildCtx("0");
  return (deployFleet as Function)(
    { G, ctx, playerID: "0", events: stubEvents, random: {} },
    fleetIndex,
    dest,
    skyships,
    regiments,
    levies
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("deployFleet — fleet units", () => {
  it("sets fleet skyships from arg and deducts from player resources", () => {
    const G = buildDeployG();
    const skyshipsBefore = G.playerInfo["0"].resources.skyships; // 3
    callDeploy(G, 0, [3, 0], 2, 0, 0);
    expect(G.playerInfo["0"].fleetInfo[0].skyships).toBe(2);
    expect(G.playerInfo["0"].resources.skyships).toBe(skyshipsBefore - 2);
  });
});

describe("deployFleet — fleet location", () => {
  it("moves fleet location to destination", () => {
    const G = buildDeployG();
    callDeploy(G, 0, [3, 0], 2, 0, 0);
    expect(G.playerInfo["0"].fleetInfo[0].location).toEqual([3, 0]);
  });
});

describe("deployFleet — gold cost", () => {
  it("charges 1 gold for a 1-hop destination", () => {
    const G = buildDeployG();
    const goldBefore = G.playerInfo["0"].resources.gold; // 6
    callDeploy(G, 0, [3, 0], 2, 0, 0);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 1);
  });
});

describe("deployFleet — counsellor cost", () => {
  it("removes 1 counsellor", () => {
    const G = buildDeployG();
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors; // 4
    callDeploy(G, 0, [3, 0], 2, 0, 0);
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore - 1);
  });
});

describe("deployFleet — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildDeployG({ counsellors: 0 });
    const result = callDeploy(G, 0, [3, 0], 2, 0, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when deploying 0 skyships", () => {
    const G = buildDeployG();
    const result = callDeploy(G, 0, [3, 0], 0, 0, 0);
    expect(result).toBe(INVALID_MOVE);
  });
});
