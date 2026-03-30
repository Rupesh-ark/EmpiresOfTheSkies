/**
 * relocateDefeatedFleet.test.ts
 *
 * Tests for the relocateDefeatedFleet move (v4.2).
 *
 * Source logic:
 *   - Moves all fleets of defeatedPlayer that are at currentBattle to destination
 *   - Updates battleMap: remove defeatedPlayer from old tile, add to destination
 *   - If defender did NOT evade, OR only 1 player remains at battle tile:
 *       → calls findNextPlayerInBattleSequence (clears battleState, advances sequence)
 *   - Else (defender evaded AND ≥2 players remain at battle tile):
 *       → G.battleState = undefined, G.stage = "attack or pass"
 */

import { describe, it, expect } from "vitest";
import relocateDefeatedFleet from "../../moves/aerialBattle/relocateDefeatedFleet";
import { buildInitialG, buildPlayer, buildCtx, buildFleet } from "../testHelpers";

const stubEvents = { endTurn: (_args?: any) => {}, endPhase: () => {} } as any;

// ── Map helper ─────────────────────────────────────────────────────────────────
function buildBattleMap(rows = 4, cols = 8): string[][][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => [] as string[])
  );
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("relocateDefeatedFleet — fleet location", () => {
  it("moves defeated player's fleet from currentBattle to destination", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
    ]);
    G.mapState.currentBattle = [0, 0];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[0][0] = ["0", "1"];
    G.mapState.battleMap[0][2] = [];
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1"] };

    (relocateDefeatedFleet as Function)(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [2, 0],  // destination
      "1"      // defeated player
    );

    expect(G.playerInfo["1"].fleetInfo[0].location).toEqual([2, 0]);
  });
});

describe("relocateDefeatedFleet — battleMap update", () => {
  it("removes defeated player from old tile and adds them to destination tile", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
    ]);
    G.mapState.currentBattle = [0, 0];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[0][0] = ["0", "1"];
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "fight", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1"] };

    (relocateDefeatedFleet as Function)(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [2, 0],
      "1"
    );

    expect(G.mapState.battleMap[0][0]).not.toContain("1");
    expect(G.mapState.battleMap[0][2]).toContain("1");
  });
});

describe("relocateDefeatedFleet — evade branch", () => {
  it("sets battleState to undefined and stage to 'attack or pass' when defender evaded and ≥2 players remain at battle tile", () => {
    // 3 players at [0,0]. Relocate "1" → "0" and "2" remain (length=2 ≥ 2).
    // defender.decision = "evade" → else branch fires.
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
      buildPlayer("1", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
      buildPlayer("2", { fleetInfo: [buildFleet(0, { location: [0, 0] })] }),
    ]);
    G.mapState.currentBattle = [0, 0];
    G.mapState.battleMap = buildBattleMap();
    G.mapState.battleMap[0][0] = ["0", "1", "2"];
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "evade", ...G.playerInfo["1"] },
    };
    const ctx = { ...buildCtxWithPhase("0"), playOrder: ["0", "1", "2"] };

    (relocateDefeatedFleet as Function)(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      [5, 0],  // destination far away
      "1"
    );

    // After relocation: "0" and "2" remain at [0,0] (length=2), defender evaded → else branch
    expect(G.battleState).toBeUndefined();
    expect(G.stage).toBe("attack or pass");
  });
});
