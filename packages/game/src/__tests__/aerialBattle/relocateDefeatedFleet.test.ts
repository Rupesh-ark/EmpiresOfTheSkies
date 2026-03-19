/**
 * relocateDefeatedFleet.test.ts
 *
 * Tests for the relocateDefeatedFleet move (v4.2).
 *
 * Source logic:
 *   - Validates destination per v4.2: must be same tile, Faithdom, or discovered+adjacent+no enemies
 *   - Moves all fleets of defeatedPlayer that are at currentBattle to destination
 *   - Updates battleMap: remove defeatedPlayer from old tile, add to destination
 *   - If defender did NOT evade, OR only 1 player remains at battle tile:
 *       → calls findNextPlayerInBattleSequence (clears battleState, advances sequence)
 *   - Else (defender evaded AND ≥2 players remain at battle tile):
 *       → G.battleState = undefined, G.stage = "attack or pass"
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import relocateDefeatedFleet from "../../moves/aerialBattle/relocateDefeatedFleet";
import { buildInitialG, buildPlayer, buildCtx, buildFleet } from "../testHelpers";

const stubEvents = { endTurn: (_args?: any) => {}, endPhase: () => {} } as any;

// ── Map helper ─────────────────────────────────────────────────────────────────
function buildBattleMap(rows = 4, cols = 8): string[][][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => [] as string[])
  );
}

/**
 * Build a 4×8 discovered tiles grid where every cell is true.
 * Used so adjacency tests aren't blocked by the "must be discovered" check.
 */
function buildFullyDiscoveredTiles(): boolean[][] {
  return Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => true));
}

function buildCtxWithPhase(playerID: string) {
  return {
    ...buildCtx(playerID),
    playOrder: Object.keys({}),   // will be set per-test
    activePlayers: null,
    turn: 1,
    phase: "battle",
    playOrderPos: 0,
    numMoves: 0,
  };
}

// ── Happy path: fleet relocation ───────────────────────────────────────────────

describe("relocateDefeatedFleet — fleet location", () => {
  it("moves defeated player's fleet from currentBattle to adjacent discovered destination", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
    ]);
    G.mapState.currentBattle = [1, 1];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[1][1] = ["0", "1"];
    G.mapState.discoveredTiles = buildFullyDiscoveredTiles();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1"] };

    relocateDefeatedFleet.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [2, 1],  // destination: adjacent to [1,1]
      "1"      // defeated player
    );

    expect(G.playerInfo["1"].fleetInfo[0].location).toEqual([2, 1]);
  });
});

describe("relocateDefeatedFleet — battleMap update", () => {
  it("removes defeated player from old tile and adds them to destination tile", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
    ]);
    G.mapState.currentBattle = [1, 1];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[1][1] = ["0", "1"];
    G.mapState.discoveredTiles = buildFullyDiscoveredTiles();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1"] };

    relocateDefeatedFleet.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [2, 1],
      "1"
    );

    expect(G.mapState.battleMap[1][1]).not.toContain("1");
    expect(G.mapState.battleMap[1][2]).toContain("1");
  });
});

describe("relocateDefeatedFleet — evade branch", () => {
  it("sets battleState to undefined and stage to 'attack or pass' when defender evaded and ≥2 players remain", () => {
    // 3 players at [1,1]. Relocate "1" to Faithdom [3,0] → "0" and "2" remain (length=2 ≥ 2).
    // defender.decision = "evade" → else branch fires.
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
      buildPlayer("2", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
    ]);
    G.mapState.currentBattle = [1, 1];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[1][1] = ["0", "1", "2"];
    G.mapState.discoveredTiles = buildFullyDiscoveredTiles();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "evade", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1", "2"] };

    relocateDefeatedFleet.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [3, 0],  // Faithdom — always valid destination
      "1"
    );

    // After relocation: "0" and "2" remain at [1,1] (length=2), defender evaded → else branch
    expect(G.battleState).toBeUndefined();
    expect(G.stage).toBe("attack or pass");
  });
});

// ── Faithdom exemptions ────────────────────────────────────────────────────────

describe("relocateDefeatedFleet — Faithdom destinations", () => {
  it("allows retreat to any Faithdom tile regardless of adjacency or enemy fleets", () => {
    // Battle at [0,0], Faithdom [4,0] is not adjacent. Should still succeed.
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
    ]);
    G.mapState.currentBattle = [0, 0];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[0][0] = ["0", "1"];
    // Faithdom [4,0] has an unfriendly player "0" — still valid because Faithdom exemption
    G.mapState.battleMap[0][4] = ["0"];
    G.mapState.discoveredTiles = buildFullyDiscoveredTiles();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1"] };

    relocateDefeatedFleet.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [4, 0],  // Faithdom tile — non-adjacent, has enemy, but exempt
      "1"
    );

    expect(G.playerInfo["1"].fleetInfo[0].location).toEqual([4, 0]);
  });
});

describe("relocateDefeatedFleet — same tile destination", () => {
  it("allows retreat to the same battle tile (staying put)", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
    ]);
    G.mapState.currentBattle = [1, 1];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[1][1] = ["0", "1"];
    G.mapState.discoveredTiles = buildFullyDiscoveredTiles();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1"] };

    const result = relocateDefeatedFleet.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [1, 1],  // same tile
      "1"
    );

    expect(result).not.toBe(INVALID_MOVE);
  });
});

// ── Validation rejections ──────────────────────────────────────────────────────

describe("relocateDefeatedFleet — validation: undiscovered tile", () => {
  it("returns INVALID_MOVE when destination tile is not discovered", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
    ]);
    G.mapState.currentBattle = [1, 1];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[1][1] = ["0", "1"];
    // discoveredTiles left as [] (default) → every tile is undiscovered
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1"] };

    const result = relocateDefeatedFleet.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [2, 1],  // adjacent but not discovered
      "1"
    );

    expect(result).toBe(INVALID_MOVE);
  });
});

describe("relocateDefeatedFleet — validation: non-adjacent tile", () => {
  it("returns INVALID_MOVE when destination is discovered but not adjacent to battle tile", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
    ]);
    G.mapState.currentBattle = [0, 0];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[0][0] = ["0", "1"];
    G.mapState.discoveredTiles = buildFullyDiscoveredTiles();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1"] };

    const result = relocateDefeatedFleet.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [5, 0],  // discovered but not adjacent to [0,0]
      "1"
    );

    expect(result).toBe(INVALID_MOVE);
  });
});

describe("relocateDefeatedFleet — validation: enemy fleet at destination", () => {
  it("returns INVALID_MOVE when destination has an unfriendly fleet (non-Faithdom)", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [1, 1] })] }),
      buildPlayer("2", { fleetInfo: [buildFleet(0, { location: [2, 1] })] }),
    ]);
    G.mapState.currentBattle = [1, 1];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[1][1] = ["0", "1"];
    G.mapState.battleMap[1][2] = ["2"];  // enemy fleet at adjacent tile
    G.mapState.discoveredTiles = buildFullyDiscoveredTiles();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1", "2"] };

    const result = relocateDefeatedFleet.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [2, 1],  // adjacent and discovered, but player "2" is there (not "1")
      "1"
    );

    expect(result).toBe(INVALID_MOVE);
  });
});
