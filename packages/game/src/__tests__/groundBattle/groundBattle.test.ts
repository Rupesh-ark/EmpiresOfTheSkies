/**
 * groundBattle.test.ts
 *
 * Tests for ground battle mechanics (v4.2).
 *
 * Covers:
 *   - attackPlayersBuilding: creates battleState, advances to "defend or yield"
 *   - defendGroundAttack: defender sets decision to "fight"
 *   - yieldToAttacker: defender yields — returns garrisons to their player, transfers ownership
 *   - garrisonTroops: moves troops from fleet into building, updates building ownership
 */

import { describe, it, expect } from "vitest";
import attackPlayersBuilding from "../../moves/groundBattle/attackPlayersBuilding";
import defendGroundAttack from "../../moves/groundBattle/defendGroundAttack";
import yieldToAttacker from "../../moves/groundBattle/yieldToAttacker";
import garrisonTroops from "../../moves/groundBattle/garrisonTroops";
import { buildInitialG, buildPlayer, buildCtx, buildFleet } from "../testHelpers";

const stubEvents = { endTurn: (_args?: any) => {}, endPhase: () => {} } as any;

function buildCtxWithPhase(playerID: string, phase = "ground_battle") {
  return {
    ...buildCtx(playerID),
    currentPlayer: playerID,
    phase,
    playOrder: ["0", "1"],
    playOrderPos: 0,
    numMoves: 0,
  };
}

// Build a minimal 4×8 map with one building at [0,0] owned by player
function buildMapWithBuilding(ownerPlayer: ReturnType<typeof buildPlayer>, type: "outpost" | "colony" = "outpost") {
  const ROWS = 4, COLS = 8;
  const buildings: any[][] = [];
  const currentTileArray: any[][] = [];
  const discoveredTiles: boolean[][] = [];
  for (let r = 0; r < ROWS; r++) {
    buildings[r] = [];
    currentTileArray[r] = [];
    discoveredTiles[r] = [];
    for (let c = 0; c < COLS; c++) {
      buildings[r][c] = {
        player: r === 0 && c === 0 ? ownerPlayer : undefined,
        buildings: r === 0 && c === 0 ? type : undefined,
        fort: false,
        garrisonedRegiments: r === 0 && c === 0 ? 2 : 0,
        garrisonedLevies: r === 0 && c === 0 ? 1 : 0,
      };
      currentTileArray[r][c] = {
        name: "test", blocked: [], sword: 0, shield: 0, type: "land",
        loot: {
          outpost: { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 },
          colony: { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 },
        },
      };
      discoveredTiles[r][c] = r === 0 && c === 0;
    }
  }
  const battleMap: string[][][] = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => (r === 0 && c === 0 ? ["0"] : []))
  );
  return { buildings, currentTileArray, discoveredTiles, battleMap };
}

// ── attackPlayersBuilding ─────────────────────────────────────────────────────

describe("attackPlayersBuilding — initiating ground attack", () => {
  it("creates battleState targeting the building owner", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const mapParts = buildMapWithBuilding(G.playerInfo["1"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];

    const ctx = buildCtxWithPhase("0");
    (attackPlayersBuilding as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });

    expect(G.battleState?.attacker.id).toBe("0");
    expect(G.battleState?.defender.id).toBe("1");
  });

  it("advances stage to 'defend or yield'", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const mapParts = buildMapWithBuilding(G.playerInfo["1"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];

    const ctx = buildCtxWithPhase("0");
    (attackPlayersBuilding as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.stage).toBe("defend or yield");
  });
});

// ── defendGroundAttack ────────────────────────────────────────────────────────

describe("defendGroundAttack — defender chooses to fight", () => {
  it("sets defender decision to 'fight'", () => {
    const G = buildInitialG();
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "undecided", ...G.playerInfo["1"] },
    };
    const ctx = buildCtxWithPhase("1");
    (defendGroundAttack as Function)({ G, ctx, playerID: "1", events: stubEvents, random: {} });
    expect(G.battleState.defender.decision).toBe("fight");
  });
});

// ── yieldToAttacker ───────────────────────────────────────────────────────────

describe("yieldToAttacker — defender surrenders", () => {
  it("returns garrisoned regiments to the defending player", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const mapParts = buildMapWithBuilding(G.playerInfo["1"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "undecided", ...G.playerInfo["1"] },
    };
    const regimentsBefore = G.playerInfo["1"].resources.regiments;
    const ctx = buildCtxWithPhase("1");
    (yieldToAttacker as Function)({ G, ctx, playerID: "1", events: stubEvents, random: {} });
    // Garrisoned 2 regiments returned to player "1"
    expect(G.playerInfo["1"].resources.regiments).toBe(regimentsBefore + 2);
  });

  it("returns garrisoned levies to the defending player", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const mapParts = buildMapWithBuilding(G.playerInfo["1"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "undecided", ...G.playerInfo["1"] },
    };
    const leviesBefore = G.playerInfo["1"].resources.levies;
    const ctx = buildCtxWithPhase("1");
    (yieldToAttacker as Function)({ G, ctx, playerID: "1", events: stubEvents, random: {} });
    expect(G.playerInfo["1"].resources.levies).toBe(leviesBefore + 1);
  });

  it("transfers building ownership to the attacker", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const mapParts = buildMapWithBuilding(G.playerInfo["1"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "undecided", ...G.playerInfo["1"] },
    };
    const ctx = buildCtxWithPhase("1");
    (yieldToAttacker as Function)({ G, ctx, playerID: "1", events: stubEvents, random: {} });
    expect(G.mapState.buildings[0][0].player?.id).toBe("0");
  });

  it("clears battleState after yielding", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    const mapParts = buildMapWithBuilding(G.playerInfo["1"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo["0"] },
      defender: { decision: "undecided", ...G.playerInfo["1"] },
    };
    const ctx = buildCtxWithPhase("1");
    (yieldToAttacker as Function)({ G, ctx, playerID: "1", events: stubEvents, random: {} });
    expect(G.battleState).toBeUndefined();
  });
});

// ── garrisonTroops ────────────────────────────────────────────────────────────

describe("garrisonTroops — moving troops from fleet to building", () => {
  it("adds regiments to the building's garrisoned count", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0], regiments: 4, levies: 0, skyships: 2 })] }),
    ]);
    const mapParts = buildMapWithBuilding(G.playerInfo["0"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];
    G.mapState.buildings[0][0].garrisonedRegiments = 0;
    G.mapState.buildings[0][0].garrisonedLevies = 0;

    const ctx = buildCtxWithPhase("0", "conquest");
    (garrisonTroops as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} }, [2, 0]);

    expect(G.mapState.buildings[0][0].garrisonedRegiments).toBe(2);
  });

  it("removes garrisoned regiments from the fleet at that location", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0], regiments: 4, levies: 0, skyships: 2 })] }),
    ]);
    const mapParts = buildMapWithBuilding(G.playerInfo["0"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];
    G.mapState.buildings[0][0].garrisonedRegiments = 0;

    const ctx = buildCtxWithPhase("0", "conquest");
    (garrisonTroops as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} }, [2, 0]);

    const fleet = G.playerInfo["0"].fleetInfo.find((f) => f.location[0] === 0 && f.location[1] === 0);
    expect(fleet?.regiments).toBe(2); // 4 - 2
  });

  it("sets building ownership to the garrisoning player", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [0, 0], regiments: 2, levies: 0, skyships: 2 })] }),
    ]);
    const mapParts = buildMapWithBuilding(G.playerInfo["0"]);
    G.mapState = { ...G.mapState, ...mapParts };
    G.mapState.currentBattle = [0, 0];

    const ctx = buildCtxWithPhase("0", "conquest");
    (garrisonTroops as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} }, [1, 0]);

    expect(G.mapState.buildings[0][0].player?.id).toBe("0");
  });
});