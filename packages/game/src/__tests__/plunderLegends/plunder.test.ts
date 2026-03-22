/**
 * plunder.test.ts
 *
 * Tests for the plunder move (v4.2, plunder legends phase).
 *
 * Rules:
 *   - Transfers all colony loot from currentBattle tile to the plundering player
 *   - A tile with empty loot adds nothing to resources
 *   - After transferring loot, findNextPlunder is called; if no more legend tiles
 *     exist it calls events.endPhase() (handled safely by stubEvents)
 */

import { describe, it, expect } from "vitest";
import { buildInitialG, buildPlayer, buildCtx, buildResources, buildEvents, buildRandom } from "../testHelpers";
import plunder from "../../moves/plunderLegends/plunder";
import type { TileInfoProps } from "../../types";

const stubEvents = buildEvents();

// ── Map helpers ───────────────────────────────────────────────────────────────

function buildEmptyLoot() {
  return {
    gold: 0,
    mithril: 0,
    dragonScales: 0,
    krakenSkin: 0,
    magicDust: 0,
    stickyIchor: 0,
    pipeweed: 0,
    victoryPoints: 0,
  };
}

function buildTile(type: TileInfoProps["type"] = "land", colonyLootOverrides = {}): TileInfoProps {
  return {
    name: "test_tile",
    blocked: [],
    sword: 0,
    shield: 0,
    loot: {
      outpost: buildEmptyLoot(),
      colony: { ...buildEmptyLoot(), ...colonyLootOverrides },
    },
    type,
  };
}

/**
 * Builds a 4×8 currentTileArray and a matching 4×8 battleMap.
 * Tile [0, 0] gets the provided colonyLootOverrides; all others are plain "land"
 * tiles with empty loot (not "legend", so findNextPlunder exits immediately).
 */
function buildPlunderMap(colonyLootAt00 = {}) {
  const currentTileArray: TileInfoProps[][] = [];
  const battleMap: string[][][] = [];

  for (let row = 0; row < 4; row++) {
    currentTileArray[row] = [];
    battleMap[row] = [];
    for (let col = 0; col < 8; col++) {
      const isOrigin = row === 0 && col === 0;
      currentTileArray[row][col] = buildTile("land", isOrigin ? colonyLootAt00 : {});
      battleMap[row][col] = [];
    }
  }

  return { currentTileArray, battleMap };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("plunder — colony loot transfer", () => {
  it("transfers gold and mithril from the tile's colony loot to the plundering player", () => {
    const playerID = "0";
    const { currentTileArray, battleMap } = buildPlunderMap({ gold: 3, mithril: 2 });

    const G = buildInitialG(
      [buildPlayer(playerID, { resources: buildResources({ gold: 5, mithril: 0 }) })],
      {
        mapState: {
          currentTileArray,
          battleMap,
          currentBattle: [0, 0],
          discoveredTiles: [],
          buildings: [],
          mostRecentlyDiscoveredTile: [],
          discoveredRaces: [],
          goodsPriceMarkers: {
            mithril: 2, dragonScales: 2, krakenSkin: 2,
            magicDust: 2, stickyIchor: 2, pipeweed: 2,
          },
        },
      }
    );

    plunder.fn(
      { G, ctx: buildCtx(playerID), playerID, events: stubEvents, random: buildRandom() }
    );

    expect(G.playerInfo[playerID].resources.gold).toBe(8);    // 5 + 3
    expect(G.playerInfo[playerID].resources.mithril).toBe(2); // 0 + 2
  });

  it("adds nothing when the tile has empty colony loot", () => {
    const playerID = "0";
    // Use currentBattle = [1, 0], which has empty loot
    const { currentTileArray, battleMap } = buildPlunderMap({ gold: 3, mithril: 2 });

    const G = buildInitialG(
      [buildPlayer(playerID, { resources: buildResources({ gold: 5, mithril: 1 }) })],
      {
        mapState: {
          currentTileArray,
          battleMap,
          currentBattle: [1, 0],   // tile [1,0] has all-zero loot
          discoveredTiles: [],
          buildings: [],
          mostRecentlyDiscoveredTile: [],
          discoveredRaces: [],
          goodsPriceMarkers: {
            mithril: 2, dragonScales: 2, krakenSkin: 2,
            magicDust: 2, stickyIchor: 2, pipeweed: 2,
          },
        },
      }
    );

    plunder.fn(
      { G, ctx: buildCtx(playerID), playerID, events: stubEvents, random: buildRandom() }
    );

    expect(G.playerInfo[playerID].resources.gold).toBe(5);    // unchanged
    expect(G.playerInfo[playerID].resources.mithril).toBe(1); // unchanged
  });
});
