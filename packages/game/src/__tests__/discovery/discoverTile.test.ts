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
import { buildInitialG, buildPlayer, buildCtx, buildEvents, buildRandom } from "../testHelpers";
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

// discoverTile assumes exactly 4 rows (y 0–3) and 8 columns (x 0–7, wrapping).
// Build a proper 4×8 grid.  [0, 0] = home (discovered), [1, 0] = the target.
function buildMinimalMap(target: TileInfoProps) {
  const home    = buildTile("home1", "home");
  const filler  = buildTile("ocean0", "ocean");
  const ROWS = 4, COLS = 8;

  const currentTileArray: TileInfoProps[][] = [];
  const discoveredTiles: boolean[][] = [];
  const buildings: any[][] = [];

  for (let row = 0; row < ROWS; row++) {
    currentTileArray[row] = [];
    discoveredTiles[row] = [];
    buildings[row] = [];
    for (let col = 0; col < COLS; col++) {
      currentTileArray[row][col] = (row === 0 && col === 0) ? home
                                 : (row === 0 && col === 1) ? target
                                 : filler;
      discoveredTiles[row][col] = row === 0 && col === 0; // only home is discovered
      buildings[row][col] = { fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
    }
  }

  return {
    currentTileArray,
    discoveredTiles,
    buildings,
    mostRecentlyDiscoveredTile: [0, 0],
    discoveredRaces: [] as string[],
    battleMap: [] as string[][][],
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
  const events = buildEvents();
  return discoverTile.fn({ G, ctx, playerID, events, random: buildRandom() }, coords);
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
    // Start with the full 4×8 map where [0,0] is discovered.
    // Try to discover [3, 0] which is NOT adjacent to [0, 0].
    G.mapState = buildMinimalMap(buildTile("elf1", "land")) as any;
    // Re-label [3,0] as a non-ocean tile to make sure it's what we're targeting
    G.mapState.currentTileArray[0][3] = buildTile("dwarf1", "land");
    // Ensure [3,0] is not discovered
    G.mapState.discoveredTiles[0][3] = false;
    // Try to discover [3, 0] which is NOT adjacent to [0, 0]
    const result = callDiscover(G, "0", [3, 0], 0);
    expect(result).toBe(INVALID_MOVE);
  });
});