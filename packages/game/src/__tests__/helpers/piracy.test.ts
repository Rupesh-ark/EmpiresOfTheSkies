/**
 * piracy.test.ts
 *
 * Tests for the enactPiracy helper (v4.2, B7).
 *
 * Rules:
 *   - Trade routes connected to Faithdom (tiles 3,0 / 4,0 / 3,1 / 4,1) via skyship chain
 *     are vulnerable to piracy by rival fleets that act as bottlenecks
 *   - Pirate (rival) collects 1 Gold from the route owner per blocking fleet
 *   - Capped at the route's total goods value (gold + goods at price markers)
 *   - sanctioned_piracy KA card: pirate gains +1 VP per act of piracy
 *   - Protection: if route owner has a fleet at the rival's tile → no piracy
 */

import { describe, it, expect } from "vitest";
import { enactPiracy } from "../../helpers/piracy";
import { buildInitialG, buildPlayer, buildFleet, buildResources } from "../testHelpers";

// ── Map builder ───────────────────────────────────────────────────────────────

// Build a map with a route from Faithdom [3,0] → outpost at [2,0]
// and a blocking rival fleet at [3,0] (Faithdom tile, which is the gateway)
function buildPiracyMap(opts: {
  outpostOwner: string;
  blockerID: string;
  outpostTile?: [number, number]; // default [2,0]
  routeValue?: number;
  blockerProtected?: boolean; // if true, route owner also has fleet at blocker tile
}) {
  const { outpostOwner, blockerID, outpostTile = [2, 0], routeValue = 3, blockerProtected = false } = opts;
  const ROWS = 4, COLS = 8;
  const buildings: any[][] = [];
  const currentTileArray: any[][] = [];
  const discoveredTiles: boolean[][] = [];

  const emptyLoot = { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 };
  const outpostLoot = { ...emptyLoot, gold: routeValue };

  for (let r = 0; r < ROWS; r++) {
    buildings[r] = [];
    currentTileArray[r] = [];
    discoveredTiles[r] = [];
    for (let c = 0; c < COLS; c++) {
      const isOutpost = r === outpostTile[1] && c === outpostTile[0];
      buildings[r][c] = {
        player: isOutpost ? { id: outpostOwner } : undefined,
        buildings: isOutpost ? "outpost" : undefined,
        fort: false,
        garrisonedRegiments: 0,
        garrisonedLevies: 0,
      };
      currentTileArray[r][c] = {
        name: "test", blocked: [], sword: 0, shield: 0, type: "land",
        loot: { outpost: outpostLoot, colony: outpostLoot },
      };
      discoveredTiles[r][c] = true;
    }
  }

  return { buildings, currentTileArray, discoveredTiles, battleMap: [] as string[][][] };
}

describe("enactPiracy — B7: piracy gold transfer", () => {
  // Outpost at [2,2] is adjacent ONLY to Faithdom tile [3,1] (diagonal [3,1]→[2,2]).
  // [3,0] is also adjacent to [2,0] and [3,1], but [2,2] cannot reach Faithdom
  // via any other Faithdom tile without [3,1] → [3,1] is a true bottleneck for [2,2].

  it("rival fleet on a bottleneck tile steals 1 Gold from the route owner", () => {
    // Player "0" has outpost at [2,2]; player "1" fleet at Faithdom tile [3,1] (bottleneck).
    // Player "0" has NO fleet at [3,1] → route is unprotected → piracy triggers.
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ gold: 5 }),
        fleetInfo: [buildFleet(0, { location: [0, 0], skyships: 2 })], // far from bottleneck
      }),
      buildPlayer("1", {
        resources: buildResources({ gold: 0 }),
        fleetInfo: [buildFleet(0, { location: [3, 1], skyships: 2 })], // on Faithdom tile [3,1]
      }),
    ]);
    G.mapState = { ...G.mapState, ...buildPiracyMap({ outpostOwner: "0", blockerID: "1", outpostTile: [2, 2], routeValue: 3 }) };
    G.mapState.goodsPriceMarkers = { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 };

    enactPiracy(G);

    expect(G.playerInfo["0"].resources.gold).toBe(4); // lost 1 Gold
    expect(G.playerInfo["1"].resources.gold).toBe(1); // gained 1 Gold
  });

  it("sanctioned_piracy KA card grants +1 VP per act of piracy", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ gold: 5 }),
        fleetInfo: [buildFleet(0, { location: [0, 0], skyships: 2 })],
      }),
      buildPlayer("1", {
        resources: buildResources({ gold: 0, advantageCard: "sanctioned_piracy" }),
        fleetInfo: [buildFleet(0, { location: [3, 1], skyships: 2 })],
      }),
    ]);
    G.mapState = { ...G.mapState, ...buildPiracyMap({ outpostOwner: "0", blockerID: "1", outpostTile: [2, 2], routeValue: 3 }) };
    G.mapState.goodsPriceMarkers = { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 };

    const vpBefore = G.playerInfo["1"].resources.victoryPoints;
    enactPiracy(G);
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(vpBefore + 1);
  });

  it("no piracy when route owner has a fleet at the rival's bottleneck tile (protected route)", () => {
    // Player "0" also has a fleet at [3,1] (same tile as rival) → protection rule applies.
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ gold: 5 }),
        fleetInfo: [buildFleet(0, { location: [3, 1], skyships: 1 })], // at the same tile as rival
      }),
      buildPlayer("1", {
        resources: buildResources({ gold: 0 }),
        fleetInfo: [buildFleet(0, { location: [3, 1], skyships: 2 })],
      }),
    ]);
    G.mapState = { ...G.mapState, ...buildPiracyMap({ outpostOwner: "0", blockerID: "1", outpostTile: [2, 2], routeValue: 3 }) };
    G.mapState.goodsPriceMarkers = { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 };

    enactPiracy(G);
    expect(G.playerInfo["0"].resources.gold).toBe(5); // unchanged
    expect(G.playerInfo["1"].resources.gold).toBe(0); // unchanged
  });
});