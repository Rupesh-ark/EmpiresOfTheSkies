/**
 * battleFlow.test.ts (integration)
 *
 * Tests the complete battle flow chain (v4.2):
 *   aerial phase → attacker initiates → defender responds (evade or retaliate)
 *   → battle resolves (FoW cards, VP award, fleet losses)
 *   ground phase → attacker attacks building → defender yields
 *   → conquest → outpost placed → garrison troops
 *
 * Key mechanics exercised:
 *   - attackOtherPlayersFleet sets battleState and stage="attack or evade"
 *   - retaliate sets defender.decision="fight"
 *   - evadeAttackingFleet sets defender.decision="evade" and stage="relocate loser"
 *   - resolveBattleAndReturnWinner applies FoW cards, calculates losses, awards +1 VP
 *   - attackPlayersBuilding creates battleState against the building owner
 *   - yieldToAttacker returns garrisons to defender, transfers ownership, clears battleState
 *   - constructOutpost places outpost and advances stage to "garrison troops"
 *   - garrisonTroops deducts troops from fleet and adds them to the building garrison
 *
 * Map setup:
 *   - 4×8 grid with discovered tile at [0,0]
 *   - Player 0 fleet: 5 skyships, 10 regiments at [0,0]
 *   - Player 1 fleet: 3 skyships, 5 regiments at [0,0]
 *   - Player 1 owns an outpost at [0,0] with 2 garrisoned regiments
 *   - Both players on battleMap at [0,0]
 *   - currentBattle = [0,0]
 */

import { describe, it, expect, vi } from "vitest";
import attackOtherPlayersFleet from "../../moves/aerialBattle/attackOtherPlayersFleet";
import retaliate from "../../moves/aerialBattle/retaliate";
import evadeAttackingFleet from "../../moves/aerialBattle/evadeAttackingFleet";
import attackPlayersBuilding from "../../moves/groundBattle/attackPlayersBuilding";
import yieldToAttacker from "../../moves/groundBattle/yieldToAttacker";
import garrisonTroops from "../../moves/groundBattle/garrisonTroops";
import constructOutpost from "../../moves/conquests/constructOutpost";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle";
import {
  buildInitialG,
  buildPlayer,
  buildCtx,
  buildFleet,
  buildRandom,
} from "../testHelpers";
import type { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

// ── Helpers ────────────────────────────────────────────────────────────────

const stubEvents = () =>
  ({
    endTurn: vi.fn(),
    endPhase: vi.fn(),
  } as unknown as EventsAPI & {
    endTurn: ReturnType<typeof vi.fn>;
    endPhase: ReturnType<typeof vi.fn>;
  });

function buildCtxForPhase(playerID: string, phase = "aerial_battle") {
  return {
    ...buildCtx(playerID),
    currentPlayer: playerID,
    phase,
    playOrder: ["0", "1"],
    playOrderPos: 0,
    numMoves: 0,
    activePlayers: null,
    turn: 1,
  };
}

/**
 * Builds a 4×8 map state with:
 *   - All tiles type="land", sword=0, shield=0
 *   - Tile [0,0]: discovered, with an outpost owned by player 1,
 *     2 garrisoned regiments, 1 garrisoned levy
 *   - battleMap[0][0] = ["0", "1"] (both fleets at the contested tile)
 */
function buildBattleMap(player0: ReturnType<typeof buildPlayer>, player1: ReturnType<typeof buildPlayer>) {
  const ROWS = 4;
  const COLS = 8;
  const buildings: any[][] = [];
  const currentTileArray: any[][] = [];
  const discoveredTiles: boolean[][] = [];

  for (let r = 0; r < ROWS; r++) {
    buildings[r] = [];
    currentTileArray[r] = [];
    discoveredTiles[r] = [];
    for (let c = 0; c < COLS; c++) {
      buildings[r][c] = {
        // Player 1 owns an outpost at [0,0] with some garrisoned troops
        player: r === 0 && c === 0 ? player1 : undefined,
        buildings: r === 0 && c === 0 ? "outpost" : undefined,
        fort: false,
        garrisonedRegiments: r === 0 && c === 0 ? 2 : 0,
        garrisonedLevies: r === 0 && c === 0 ? 1 : 0,
        garrisonedEliteRegiments: 0,
      };
      currentTileArray[r][c] = {
        name: r === 0 && c === 0 ? "Ashfield" : "empty",
        blocked: [],
        sword: 0,
        shield: 0,
        type: "land",
        loot: {
          outpost: {
            gold: 0,
            mithril: 0,
            dragonScales: 0,
            krakenSkin: 0,
            magicDust: 0,
            stickyIchor: 0,
            pipeweed: 0,
            victoryPoints: 0,
          },
          colony: {
            gold: 0,
            mithril: 0,
            dragonScales: 0,
            krakenSkin: 0,
            magicDust: 0,
            stickyIchor: 0,
            pipeweed: 0,
            victoryPoints: 0,
          },
        },
      };
      discoveredTiles[r][c] = r === 0 && c === 0;
    }
  }

  // Both players present at the contested tile
  const battleMap: string[][][] = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => (r === 0 && c === 0 ? ["0", "1"] : []))
  );

  return { buildings, currentTileArray, discoveredTiles, battleMap };
}

/**
 * Builds the full game state for all battle-flow integration tests.
 * Player 0: attacker — 5 skyships, 10 regiments at [0,0]
 * Player 1: defender — 3 skyships, 5 regiments at [0,0], outpost at [0,0]
 */
function buildBattleG() {
  const player0 = buildPlayer("0", {
    fleetInfo: [buildFleet(0, { location: [0, 0], skyships: 5, regiments: 10 })],
  });
  const player1 = buildPlayer("1", {
    fleetInfo: [buildFleet(1, { location: [0, 0], skyships: 3, regiments: 5 })],
  });

  const G = buildInitialG([player0, player1], { stage: "attack or pass" });
  const mapParts = buildBattleMap(G.playerInfo["0"], G.playerInfo["1"]);
  G.mapState = { ...G.mapState, ...mapParts };
  G.mapState.currentBattle = [0, 0];
  return G;
}

// ── Test 1: Aerial battle — attacker initiates → defender retaliates → FoW → VP ──

describe("aerial: attacker initiates → defender retaliates → battle resolves with VP award", () => {
  it("attackOtherPlayersFleet sets attacker=fight, defender=undecided, stage='attack or evade'", () => {
    const G = buildBattleG();
    const events = stubEvents();
    const ctx = buildCtxForPhase("0");

    attackOtherPlayersFleet.fn({ G, ctx, playerID: "0", events, random: buildRandom() }, "1");

    expect(G.battleState?.attacker.id).toBe("0");
    expect(G.battleState?.attacker.decision).toBe("fight");
    expect(G.battleState?.defender.id).toBe("1");
    expect(G.battleState?.defender.decision).toBe("undecided");
    expect(G.stage).toBe("attack or evade");
  });

  it("retaliate sets defender.decision to 'fight'", () => {
    const G = buildBattleG();
    const events = stubEvents();

    // Step 1: attacker initiates
    attackOtherPlayersFleet.fn(
      { G, ctx: buildCtxForPhase("0"), playerID: "0", events, random: buildRandom() },
      "1"
    );

    // Step 2: defender retaliates
    retaliate.fn({ G, ctx: buildCtxForPhase("1"), playerID: "1", events, random: buildRandom() });

    expect(G.battleState?.defender.decision).toBe("fight");
  });

  it("winner gains +1 VP when FoW cards are assigned and battle resolves", () => {
    const G = buildBattleG();
    const events = stubEvents();

    // Step 1: attacker initiates
    attackOtherPlayersFleet.fn(
      { G, ctx: buildCtxForPhase("0"), playerID: "0", events, random: buildRandom() },
      "1"
    );

    // Step 2: defender retaliates
    retaliate.fn({ G, ctx: buildCtxForPhase("1"), playerID: "1", events, random: buildRandom() });

    // Step 3: manually assign FoW cards (simulating "confirm_fow_draw" stage)
    // Attacker gets a powerful sword card; defender gets nothing special
    G.battleState!.attacker.fowCard = { name: "Charge", sword: 4, shield: 0 };
    G.battleState!.defender.fowCard = { name: "NoEffect", sword: 0, shield: 0 };

    const vp0Before = G.playerInfo["0"].resources.victoryPoints;
    const vp1Before = G.playerInfo["1"].resources.victoryPoints;

    // Step 4: resolve
    resolveBattleAndReturnWinner(G, events, buildCtxForPhase("0"));

    // Player 0 has 5 skyships + 10 regiments + FoW sword 4 → sword=29 vs defender shield=3
    // Player 1 has 3 skyships + 5 regiments → sword=13 vs attacker shield=5+0=5
    // Attacker losses = 13-5=8, Defender losses = 29-3=26 → attacker wins decisively
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vp0Before + 1);
    // Loser does not gain VP
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(vp1Before);
  });
});

// ── Test 2: Aerial battle — defender evades → stage becomes "relocate loser" ──

describe("aerial: defender evades → stage becomes 'relocate loser'", () => {
  it("evadeAttackingFleet sets defender.decision='evade' and stage='relocate loser'", () => {
    const G = buildBattleG();
    const events = stubEvents();

    // Step 1: attacker initiates
    attackOtherPlayersFleet.fn(
      { G, ctx: buildCtxForPhase("0"), playerID: "0", events, random: buildRandom() },
      "1"
    );

    // Step 2: defender evades instead of retaliating
    evadeAttackingFleet.fn(
      { G, ctx: buildCtxForPhase("1"), playerID: "1", events, random: buildRandom() }
    );

    expect(G.battleState?.defender.decision).toBe("evade");
    expect(G.stage).toBe("relocate loser");
  });

  it("evade calls endTurn with next=attacker (attacker directs relocation)", () => {
    const G = buildBattleG();
    const events = stubEvents();

    attackOtherPlayersFleet.fn(
      { G, ctx: buildCtxForPhase("0"), playerID: "0", events, random: buildRandom() },
      "1"
    );
    evadeAttackingFleet.fn(
      { G, ctx: buildCtxForPhase("1"), playerID: "1", events, random: buildRandom() }
    );

    // endTurn should have been called twice total — once for attack, once for evade
    // The second call should pass { next: "0" } (the attacker)
    const calls = (events.endTurn as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toEqual({ next: "0" });
  });
});

// ── Test 3: Ground battle — attacker attacks building → defender yields → ownership transfers ──

describe("ground: attacker attacks building → defender yields → ownership transfers", () => {
  it("attackPlayersBuilding creates battleState with attacker=0 and defender=1", () => {
    const G = buildBattleG();
    // Only player 0 remains on the battleMap for the ground phase
    G.mapState.battleMap[0][0] = ["0"];
    const events = stubEvents();
    const ctx = buildCtxForPhase("0", "ground_battle");

    attackPlayersBuilding.fn({ G, ctx, playerID: "0", events, random: buildRandom() });

    expect(G.battleState?.attacker.id).toBe("0");
    expect(G.battleState?.defender.id).toBe("1");
    expect(G.stage).toBe("defend or yield");
  });

  it("yieldToAttacker returns garrisoned regiments to the defender", () => {
    const G = buildBattleG();
    G.mapState.battleMap[0][0] = ["0"];
    const events = stubEvents();

    attackPlayersBuilding.fn({
      G,
      ctx: buildCtxForPhase("0", "ground_battle"),
      playerID: "0",
      events,
      random: buildRandom(),
    });

    const regimentsBefore = G.playerInfo["1"].resources.regiments;
    // Garrisoned: 2 regiments, 1 levy at [0,0]
    yieldToAttacker.fn({
      G,
      ctx: buildCtxForPhase("1", "ground_battle"),
      playerID: "1",
      events,
      random: buildRandom(),
    });

    expect(G.playerInfo["1"].resources.regiments).toBe(regimentsBefore + 2);
  });

  it("yieldToAttacker returns garrisoned levies to the defender", () => {
    const G = buildBattleG();
    G.mapState.battleMap[0][0] = ["0"];
    const events = stubEvents();

    attackPlayersBuilding.fn({
      G,
      ctx: buildCtxForPhase("0", "ground_battle"),
      playerID: "0",
      events,
      random: buildRandom(),
    });

    const leviesBefore = G.playerInfo["1"].resources.levies;
    yieldToAttacker.fn({
      G,
      ctx: buildCtxForPhase("1", "ground_battle"),
      playerID: "1",
      events,
      random: buildRandom(),
    });

    expect(G.playerInfo["1"].resources.levies).toBe(leviesBefore + 1);
  });

  it("yieldToAttacker transfers building ownership from defender to attacker", () => {
    const G = buildBattleG();
    G.mapState.battleMap[0][0] = ["0"];
    const events = stubEvents();

    attackPlayersBuilding.fn({
      G,
      ctx: buildCtxForPhase("0", "ground_battle"),
      playerID: "0",
      events,
      random: buildRandom(),
    });

    yieldToAttacker.fn({
      G,
      ctx: buildCtxForPhase("1", "ground_battle"),
      playerID: "1",
      events,
      random: buildRandom(),
    });

    expect(G.mapState.buildings[0][0].player?.id).toBe("0");
  });

  it("yieldToAttacker clears battleState after yielding", () => {
    const G = buildBattleG();
    G.mapState.battleMap[0][0] = ["0"];
    const events = stubEvents();

    attackPlayersBuilding.fn({
      G,
      ctx: buildCtxForPhase("0", "ground_battle"),
      playerID: "0",
      events,
      random: buildRandom(),
    });

    yieldToAttacker.fn({
      G,
      ctx: buildCtxForPhase("1", "ground_battle"),
      playerID: "1",
      events,
      random: buildRandom(),
    });

    expect(G.battleState).toBeUndefined();
  });
});

// ── Test 4: Conquest — outpost placed → garrison troops ──

describe("ground: after ground win → constructOutpost + garrisonTroops", () => {
  it("constructOutpost sets building type to 'outpost' at currentBattle", () => {
    const G = buildBattleG();
    // Clear the existing building so player 0 can claim it
    G.mapState.buildings[0][0].player = undefined;
    G.mapState.buildings[0][0].buildings = undefined;
    G.mapState.buildings[0][0].garrisonedRegiments = 0;
    G.mapState.buildings[0][0].garrisonedLevies = 0;
    G.mapState.battleMap[0][0] = ["0"];
    const events = stubEvents();
    const ctx = buildCtxForPhase("0", "conquest");

    constructOutpost.fn({ G, ctx, playerID: "0", events, random: buildRandom() });

    expect(G.mapState.buildings[0][0].buildings).toBe("outpost");
    expect(G.mapState.buildings[0][0].player?.id).toBe("0");
  });

  it("constructOutpost grants +1 VP to the claiming player", () => {
    const G = buildBattleG();
    G.mapState.buildings[0][0].player = undefined;
    G.mapState.buildings[0][0].buildings = undefined;
    G.mapState.buildings[0][0].garrisonedRegiments = 0;
    G.mapState.buildings[0][0].garrisonedLevies = 0;
    G.mapState.battleMap[0][0] = ["0"];

    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    const events = stubEvents();
    constructOutpost.fn({
      G,
      ctx: buildCtxForPhase("0", "conquest"),
      playerID: "0",
      events,
      random: buildRandom(),
    });

    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 1);
  });

  it("constructOutpost sets stage to 'garrison troops'", () => {
    const G = buildBattleG();
    G.mapState.buildings[0][0].player = undefined;
    G.mapState.buildings[0][0].buildings = undefined;
    G.mapState.buildings[0][0].garrisonedRegiments = 0;
    G.mapState.buildings[0][0].garrisonedLevies = 0;
    G.mapState.battleMap[0][0] = ["0"];
    const events = stubEvents();

    constructOutpost.fn({
      G,
      ctx: buildCtxForPhase("0", "conquest"),
      playerID: "0",
      events,
      random: buildRandom(),
    });

    expect(G.stage).toBe("garrison troops");
  });

  it("garrisonTroops moves regiments from fleet into building garrison", () => {
    const G = buildBattleG();
    G.mapState.buildings[0][0].player = G.playerInfo["0"];
    G.mapState.buildings[0][0].buildings = "outpost";
    G.mapState.buildings[0][0].garrisonedRegiments = 0;
    G.mapState.buildings[0][0].garrisonedLevies = 0;
    G.mapState.battleMap[0][0] = ["0"];
    const events = stubEvents();
    // Phase must be "conquest" so garrisonTroops calls findNextConquest
    const ctx = buildCtxForPhase("0", "conquest");

    garrisonTroops.fn({ G, ctx, playerID: "0", events, random: buildRandom() }, [3, 0]);

    expect(G.mapState.buildings[0][0].garrisonedRegiments).toBe(3);
    // Fleet started with 10 regiments; 3 moved to garrison
    const fleet = G.playerInfo["0"].fleetInfo.find(
      (f) => f.location[0] === 0 && f.location[1] === 0
    );
    expect(fleet?.regiments).toBe(7);
  });
});

// ── Test 5: Full chain — aerial → retaliate → resolve → ground attack → yield → outpost → garrison ──

describe("full chain: aerial attack → retaliate → resolve → ground attack → yield → outpost → garrison", () => {
  it("runs the complete battle sequence and leaves consistent state", () => {
    const G = buildBattleG();
    const events = stubEvents();

    // ── Phase 1: Aerial battle ──
    // Attacker (0) initiates
    attackOtherPlayersFleet.fn(
      { G, ctx: buildCtxForPhase("0"), playerID: "0", events, random: buildRandom() },
      "1"
    );
    expect(G.stage).toBe("attack or evade");

    // Defender (1) retaliates
    retaliate.fn(
      { G, ctx: buildCtxForPhase("1"), playerID: "1", events, random: buildRandom() }
    );
    expect(G.battleState?.defender.decision).toBe("fight");

    // Assign FoW cards: attacker gets a big sword card, defender gets nothing
    G.battleState!.attacker.fowCard = { name: "Blitz", sword: 5, shield: 0 };
    G.battleState!.defender.fowCard = { name: "NoEffect", sword: 0, shield: 0 };

    const vp0BeforeAerial = G.playerInfo["0"].resources.victoryPoints;

    // Resolve aerial battle
    resolveBattleAndReturnWinner(G, events, buildCtxForPhase("0", "aerial_battle"));

    // Player 0 sword = 5+10*2+5(FoW)=30, defender shield=3 → defender takes massive losses
    // Player 0 wins aerial battle → +1 VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBeGreaterThanOrEqual(vp0BeforeAerial + 1);

    // ── Phase 2: Ground battle (set up manually as aerial left only attacker at tile) ──
    // After aerial win, simulate that attacker now faces the defender's building
    // Reset battleMap so only player 0 remains at the tile for the ground phase
    G.mapState.battleMap[0][0] = ["0"];
    // Rebuild defender's garrison (the building still belongs to player 1)
    G.mapState.buildings[0][0].player = G.playerInfo["1"];
    G.mapState.buildings[0][0].garrisonedRegiments = 2;
    G.mapState.buildings[0][0].garrisonedLevies = 1;

    const regBefore = G.playerInfo["1"].resources.regiments;
    const levBefore = G.playerInfo["1"].resources.levies;

    attackPlayersBuilding.fn({
      G,
      ctx: buildCtxForPhase("0", "ground_battle"),
      playerID: "0",
      events,
      random: buildRandom(),
    });
    expect(G.stage).toBe("defend or yield");

    // Defender yields
    yieldToAttacker.fn({
      G,
      ctx: buildCtxForPhase("1", "ground_battle"),
      playerID: "1",
      events,
      random: buildRandom(),
    });

    // Garrisoned troops returned to defender
    expect(G.playerInfo["1"].resources.regiments).toBe(regBefore + 2);
    expect(G.playerInfo["1"].resources.levies).toBe(levBefore + 1);
    // Ownership transferred to attacker
    expect(G.mapState.buildings[0][0].player?.id).toBe("0");
    expect(G.battleState).toBeUndefined();

    // ── Phase 3: Conquest — place outpost, garrison troops ──
    G.mapState.buildings[0][0].buildings = undefined;
    G.mapState.buildings[0][0].garrisonedRegiments = 0;
    G.mapState.buildings[0][0].garrisonedLevies = 0;

    const vp0BeforeOutpost = G.playerInfo["0"].resources.victoryPoints;
    constructOutpost.fn({
      G,
      ctx: buildCtxForPhase("0", "conquest"),
      playerID: "0",
      events,
      random: buildRandom(),
    });
    expect(G.mapState.buildings[0][0].buildings).toBe("outpost");
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vp0BeforeOutpost + 1);
    expect(G.stage).toBe("garrison troops");

    // Garrison 2 regiments
    garrisonTroops.fn(
      {
        G,
        ctx: buildCtxForPhase("0", "conquest"),
        playerID: "0",
        events,
        random: buildRandom(),
      },
      [2, 0]
    );
    expect(G.mapState.buildings[0][0].garrisonedRegiments).toBe(2);

    // Final consistency: building owned by player 0 with troops garrisoned
    expect(G.mapState.buildings[0][0].player?.id).toBe("0");
    expect(G.mapState.buildings[0][0].garrisonedRegiments).toBeGreaterThan(0);
  });
});
