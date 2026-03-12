/**
 * discoverTile.test.ts
 *
 * Tests for discoverTile heresy mechanics (v4.2, B9).
 *
 * Rules:
 *   - Revealing the FIRST tile of a new race → ALL players' heresyTrackers advance +1
 *     and the race is added to discoveredRaces
 *   - Revealing subsequent tiles of the same race → no heresy advance
 *   - Legend tiles ALWAYS advance all heresyTrackers
 *   - Ocean tiles do NOT advance heresyTrackers
 *   - INVALID_MOVE if tile already discovered or not adjacent to discovered tile
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import discoverTile from "../../moves/discovery/discoverTile";
import { buildInitialG, buildPlayer, buildCtx } from "../testHelpers";
import type { TileInfoProps } from "../../types";

// ── Map helpers ───────────────────────────────────────────────────────────────

function buildTile(name: string, type: TileInfoProps["type"] = "land"): TileInfoProps {
  return {
    name,
    blocked: [],
    sword: 0,
    shield: 0,
    loot: {
      outpost: { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 },
      colony:  { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 },
    },
    type,
  };
}

/**
 * Build a minimal 2×1 map where tile [0][0] is already discovered (home)
 * and tile [1][0] is the tile we want to discover.
 */
function buildMinimalMap(tile: TileInfoProps) {
  const home = buildTile("home1", "home");
  return {
    currentTileArray: [[home, tile]], // 1 row, 2 columns
    discoveredTiles: [[true, false]],
    buildings: [[
      { fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 },
      { fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 },
    ]],
    mostRecentlyDiscoveredTile: [0, 0],
    discoveredRaces: [] as string[],
    battleMap: [[], []],
    currentBattle: [],
    goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
  };
}

function callDiscover(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  coords: [number, number],
  numMoves = 0
) {
  const ctx = { ...buildCtx(playerID), numMoves, playOrder: [playerID], playOrderPos: 0 };
  const events = { endTurn: () => {}, endPhase: () => {} };
  return (discoverTile as Function)({ G, ctx, playerID, events, random: {} }, coords);
}

// ── New race heresy advance ───────────────────────────────────────────────────

describe("discoverTile — B9: new race discovery advances all heresy trackers", () => {
  it("advances all players' heresyTracker by 1 when a new race is revealed", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: 5 }),
      buildPlayer("1", { heresyTracker: 7 }),
    ]);
    G.mapState = buildMinimalMap(buildTile("elf1", "land")) as any;

    callDiscover(G, "0", [1, 0]);

    // Both players should advance by 1
    expect(G.playerInfo["0"].heresyTracker).toBe(6);
    expect(G.playerInfo["1"].heresyTracker).toBe(8);
  });

  it("adds the new race to discoveredRaces", () => {
    const G = buildInitialG();
    G.mapState = buildMinimalMap(buildTile("elf1", "land")) as any;
    callDiscover(G, "0", [1, 0]);
    expect(G.mapState.discoveredRaces).toContain("elf");
  });

  it("does NOT advance heresy when the race was already discovered", () => {
    const G = buildInitialG([buildPlayer("0", { heresyTracker: 5 })]);
    const tile = buildTile("elf2", "land");
    G.mapState = buildMinimalMap(tile) as any;
    G.mapState.discoveredRaces = ["elf"]; // already known

    callDiscover(G, "0", [1, 0]);

    expect(G.playerInfo["0"].heresyTracker).toBe(5); // no change
  });
});

// ── Legend tiles ──────────────────────────────────────────────────────────────

describe("discoverTile — legend tiles always advance heresy", () => {
  it("legend tile advances all players' heresyTracker even if race was known", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: 5 }),
      buildPlayer("1", { heresyTracker: 5 }),
    ]);
    G.mapState = buildMinimalMap(buildTile("legend1", "legend")) as any;
    G.mapState.discoveredRaces = ["legend"]; // already known, but legend tile still advances

    callDiscover(G, "0", [1, 0]);

    expect(G.playerInfo["0"].heresyTracker).toBe(6);
    expect(G.playerInfo["1"].heresyTracker).toBe(6);
  });
});

// ── Ocean tiles ───────────────────────────────────────────────────────────────

describe("discoverTile — ocean tiles do NOT advance heresy", () => {
  it("ocean tile does not advance any heresyTracker", () => {
    const G = buildInitialG([buildPlayer("0", { heresyTracker: 5 })]);
    G.mapState = buildMinimalMap(buildTile("ocean1", "ocean")) as any;

    callDiscover(G, "0", [1, 0]);

    expect(G.playerInfo["0"].heresyTracker).toBe(5); // no change
  });
});

// ── Tile marking ──────────────────────────────────────────────────────────────

describe("discoverTile — tile state", () => {
  it("marks the tile as discovered", () => {
    const G = buildInitialG();
    G.mapState = buildMinimalMap(buildTile("dwarf1", "land")) as any;
    callDiscover(G, "0", [1, 0]);
    expect(G.mapState.discoveredTiles[0][1]).toBe(true);
  });

  it("updates mostRecentlyDiscoveredTile", () => {
    const G = buildInitialG();
    G.mapState = buildMinimalMap(buildTile("dwarf1", "land")) as any;
    callDiscover(G, "0", [1, 0]);
    expect(G.mapState.mostRecentlyDiscoveredTile).toEqual([1, 0]);
  });

  it("sets firstTurnOfRound to false", () => {
    const G = buildInitialG();
    G.firstTurnOfRound = true;
    G.mapState = buildMinimalMap(buildTile("dwarf1", "land")) as any;
    callDiscover(G, "0", [1, 0]);
    expect(G.firstTurnOfRound).toBe(false);
  });
});

// ── INVALID_MOVE ──────────────────────────────────────────────────────────────

describe("discoverTile — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE if tile is already discovered", () => {
    const G = buildInitialG();
    G.mapState = buildMinimalMap(buildTile("dwarf1", "land")) as any;
    G.mapState.discoveredTiles[0][1] = true; // already discovered
    const result = callDiscover(G, "0", [1, 0]);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if tile is not adjacent to any discovered tile (first move)", () => {
    const G = buildInitialG();
    // Build a 3-wide map: [0,0] discovered, [1,0] undiscovered, [2,0] undiscovered
    G.mapState = {
      ...buildMinimalMap(buildTile("elf1", "land")),
      currentTileArray: [[buildTile("home1", "home"), buildTile("elf1", "land"), buildTile("dwarf1", "land")]],
      discoveredTiles: [[true, false, false]],
    } as any;
    // Try to discover [2, 0] which is NOT adjacent to [0, 0]
    const result = callDiscover(G, "0", [2, 0], 0);
    expect(result).toBe(INVALID_MOVE);
  });
});