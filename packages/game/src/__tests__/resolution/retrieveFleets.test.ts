/**
 * retrieveFleets.test.ts
 *
 * Tests for retrieveFleets move (v4.2).
 *
 * Rules:
 *   - Fleet troops (skyships, regiments, levies) are returned to player resources
 *   - Fleet location is reset to [4, 0] (home dock)
 *   - Fleet stats are zeroed out after retrieval
 *   - Player is removed from battleMap at the old location only when no other
 *     fleet belonging to that player remains at that location
 *   - If another fleet is still at the same tile, battleMap entry is preserved
 */

import { describe, it, expect } from "vitest";
import { buildInitialG, buildPlayer, buildCtx, buildFleet, buildResources } from "../testHelpers";
import retrieveFleets from "../../moves/resolution/retrieveFleets";

const stubEvents = { endTurn: (_args?: any) => {}, endPhase: () => {} } as any;

// ── Map helpers ───────────────────────────────────────────────────────────────

/** Creates a 4-row × 8-col battleMap filled with empty arrays. */
function buildBattleMap(): string[][][] {
  const map: string[][][] = [];
  for (let row = 0; row < 4; row++) {
    map[row] = [];
    for (let col = 0; col < 8; col++) {
      map[row][col] = [];
    }
  }
  return map;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("retrieveFleets — troop return", () => {
  it("adds the fleet's skyships, regiments, and levies back to player resources", () => {
    const playerID = "0";
    const fleet = buildFleet(0, { location: [2, 1], skyships: 2, regiments: 3, levies: 1 });
    const G = buildInitialG(
      [buildPlayer(playerID, {
        fleetInfo: [fleet],
        resources: buildResources({ skyships: 1, regiments: 2, levies: 0 }),
      })],
      { mapState: { battleMap: buildBattleMap() } as any }
    );
    G.mapState.battleMap[1][2] = [playerID];

    (retrieveFleets as Function)(
      { G, ctx: buildCtx(playerID), playerID, events: stubEvents, random: {} },
      [0]
    );

    expect(G.playerInfo[playerID].resources.skyships).toBe(3);    // 1 + 2
    expect(G.playerInfo[playerID].resources.regiments).toBe(5);   // 2 + 3
    expect(G.playerInfo[playerID].resources.levies).toBe(1);      // 0 + 1
  });
});

describe("retrieveFleets — fleet location", () => {
  it("moves the fleet location to [4, 0]", () => {
    const playerID = "0";
    const fleet = buildFleet(0, { location: [2, 1], skyships: 2, regiments: 0, levies: 0 });
    const G = buildInitialG(
      [buildPlayer(playerID, { fleetInfo: [fleet] })],
      { mapState: { battleMap: buildBattleMap() } as any }
    );
    G.mapState.battleMap[1][2] = [playerID];

    (retrieveFleets as Function)(
      { G, ctx: buildCtx(playerID), playerID, events: stubEvents, random: {} },
      [0]
    );

    expect(G.playerInfo[playerID].fleetInfo[0].location).toEqual([4, 0]);
  });
});

describe("retrieveFleets — fleet stat zeroing", () => {
  it("sets fleet skyships, regiments, and levies to 0 after retrieval", () => {
    const playerID = "0";
    const fleet = buildFleet(0, { location: [2, 1], skyships: 4, regiments: 5, levies: 2 });
    const G = buildInitialG(
      [buildPlayer(playerID, { fleetInfo: [fleet] })],
      { mapState: { battleMap: buildBattleMap() } as any }
    );
    G.mapState.battleMap[1][2] = [playerID];

    (retrieveFleets as Function)(
      { G, ctx: buildCtx(playerID), playerID, events: stubEvents, random: {} },
      [0]
    );

    const f = G.playerInfo[playerID].fleetInfo[0];
    expect(f.skyships).toBe(0);
    expect(f.regiments).toBe(0);
    expect(f.levies).toBe(0);
  });
});

describe("retrieveFleets — battleMap scrubbing", () => {
  it("removes player from battleMap when no other fleet remains at the old tile", () => {
    const playerID = "0";
    // One fleet at [2, 1]; battleMap[1][2] contains the player
    const fleet = buildFleet(0, { location: [2, 1], skyships: 2, regiments: 0, levies: 0 });
    const G = buildInitialG(
      [buildPlayer(playerID, { fleetInfo: [fleet] })],
      { mapState: { battleMap: buildBattleMap() } as any }
    );
    G.mapState.battleMap[1][2] = [playerID];

    (retrieveFleets as Function)(
      { G, ctx: buildCtx(playerID), playerID, events: stubEvents, random: {} },
      [0]
    );

    expect(G.mapState.battleMap[1][2]).not.toContain(playerID);
  });

  it("keeps player on battleMap when a second fleet is still at the same tile", () => {
    const playerID = "0";
    // Two fleets both at [2, 1]; retrieve only fleet 0
    const fleet0 = buildFleet(0, { location: [2, 1], skyships: 2, regiments: 0, levies: 0 });
    const fleet1 = buildFleet(1, { location: [2, 1], skyships: 1, regiments: 0, levies: 0 });
    const G = buildInitialG(
      [buildPlayer(playerID, { fleetInfo: [fleet0, fleet1] })],
      { mapState: { battleMap: buildBattleMap() } as any }
    );
    G.mapState.battleMap[1][2] = [playerID];

    (retrieveFleets as Function)(
      { G, ctx: buildCtx(playerID), playerID, events: stubEvents, random: {} },
      [0]  // only retrieve fleet 0; fleet 1 stays at [2, 1]
    );

    // Fleet 1 is still at [2, 1] so the player should NOT be removed from the battleMap
    expect(G.mapState.battleMap[1][2]).toContain(playerID);
  });
});