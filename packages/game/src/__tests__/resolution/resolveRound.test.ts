/**
 * resolveRound.test.ts
 *
 * Tests for the resolveRound helper (v4.2, Track D).
 *
 * Covers:
 *   BUG-2: heresy track VP scored every round (orthodoxVP = -h, hereticVP = h)
 *   D1: goods sold at price marker value
 *   D2: trade VP by round (round 1 → [3,2,1]; rounds 2–3 → [6,4,2]; rounds 4–5 → [9,6,3]; round 6+ → [12,8,4])
 *   D3: only players with outpost or colony score trade VP
 *   D4: palace bonus (most palaces scores count − 2nd; tied = 0)
 *   D5: factory income (pool = total settlements on map; awarded by factory count desc)
 *   D7: final round — +1 VP per 5 Gold
 *   D8: debt penalty — 1 VP per 2 Gold of actual debt (negative gold only)
 */

import { describe, it, expect } from "vitest";
import resolveRound from "../../helpers/resolveRound";
import { buildInitialG, buildPlayer, buildResources } from "../testHelpers";

// events stub — resolveRound calls events.endGame() on final round
const stubEvents = { endGame: () => {}, endPhase: () => {}, endTurn: () => {} } as any;
const stubRandom = { Number: () => 0 } as any;


// ── BUG-2: Heresy track VP ────────────────────────────────────────────────────

describe("resolveRound — BUG-2: heresy track VP every round", () => {
  it("orthodox player at h=-9 gains 9 VP", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: -9, hereticOrOrthodox: "orthodox", palaces: 0 }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 9);
  });

  it("heretic player at h=+9 gains 9 VP", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: 9, hereticOrOrthodox: "heretic", palaces: 0 }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 9);
  });

  it("player at h=0 scores no heresy VP", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: 0, hereticOrOrthodox: "orthodox", palaces: 0 }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });

  it("orthodox player deep in heretic territory (h=+5) loses 5 VP", () => {
    const G = buildInitialG([
      buildPlayer("0", { heresyTracker: 5, hereticOrOrthodox: "orthodox", palaces: 0 }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore - 5);
  });
});

// ── D1: Price marker goods conversion ────────────────────────────────────────

describe("resolveRound — D1: goods sold at price marker values", () => {
  it("converts mithril at the current price marker rate", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ mithril: 3 }) }),
    ]);
    G.mapState.goodsPriceMarkers.mithril = 3;
    const goldBefore = G.playerInfo["0"].resources.gold;
    resolveRound(G, stubEvents, stubRandom);
    // 3 mithril × price 3 = 9 Gold gained
    expect(G.playerInfo["0"].resources.gold).toBeGreaterThanOrEqual(goldBefore + 9);
  });

  it("resets all goods to 0 after selling", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({
          mithril: 2, dragonScales: 1, krakenSkin: 1,
          magicDust: 1, stickyIchor: 1, pipeweed: 1,
        }),
      }),
    ]);
    resolveRound(G, stubEvents, stubRandom);
    const r = G.playerInfo["0"].resources;
    expect(r.mithril).toBe(0);
    expect(r.dragonScales).toBe(0);
    expect(r.krakenSkin).toBe(0);
    expect(r.magicDust).toBe(0);
    expect(r.stickyIchor).toBe(0);
    expect(r.pipeweed).toBe(0);
  });
});

// ── D2: Trade VP schedule ─────────────────────────────────────────────────────

describe("resolveRound — D2: trade VP by round", () => {
  function setupTwoTradersWithSettlements(G: ReturnType<typeof buildInitialG>) {
    // Give both players a mithril so they have trade goods
    G.playerInfo["0"].resources.mithril = 3;
    G.playerInfo["1"].resources.mithril = 1;
    // Give both players outposts so they qualify for trade VP
    G.mapState.buildings = [
      [
        { player: G.playerInfo["0"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 },
        { player: G.playerInfo["1"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 },
      ],
    ];
  }

  it("round 1: winner gets 3 VP", () => {
    const G = buildInitialG();
    G.round = 1;
    setupTwoTradersWithSettlements(G);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 3);
  });

  it("round 1: second place gets 2 VP", () => {
    const G = buildInitialG();
    G.round = 1;
    setupTwoTradersWithSettlements(G);
    const vpBefore = G.playerInfo["1"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(vpBefore + 2);
  });

  it("round 2: winner gets 6 VP", () => {
    const G = buildInitialG();
    G.round = 2;
    setupTwoTradersWithSettlements(G);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 6);
  });

  it("round 3: winner gets 6 VP", () => {
    const G = buildInitialG();
    G.round = 3;
    setupTwoTradersWithSettlements(G);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 6);
  });

  it("round 4: winner gets 9 VP", () => {
    const G = buildInitialG();
    G.round = 4;
    G.finalRound = 6; // so it's not the final round
    setupTwoTradersWithSettlements(G);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 9);
  });
});

// ── GAP-12: Trade VP ties round up ────────────────────────────────────────────

describe("resolveRound — GAP-12: tied trade VP splits round up", () => {
  it("two players tied for 2nd on round 1 each get ceil((2+1)/2) = 2 VP", () => {
    // Three players, all with settlements so they qualify for trade VP.
    // Player "0" has the most goods → 1st place (3 VP).
    // Players "1" and "2" are equal → tied for 2nd; share 2nd+3rd prize.
    // ceil((2+1)/2) = ceil(1.5) = 2 VP each.
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ mithril: 5 }) }),
      buildPlayer("1", { resources: buildResources({ mithril: 2 }) }),
      buildPlayer("2", { resources: buildResources({ mithril: 2 }) }),
    ]);
    G.round = 1;
    // Use two rows so no building sits at x=2 y=0, which is adjacent to faithdom
    // [3,0] and would cause piracy to crash on a missing currentTileArray entry.
    G.mapState.buildings = [
      [
        { player: G.playerInfo["0"], buildings: "outpost" as const, fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 },
        { player: G.playerInfo["1"], buildings: "outpost" as const, fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 },
      ],
      [
        { player: G.playerInfo["2"], buildings: "outpost" as const, fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 },
      ],
    ] as any;

    const vp1Before = G.playerInfo["1"].resources.victoryPoints;
    const vp2Before = G.playerInfo["2"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);

    expect(G.playerInfo["1"].resources.victoryPoints).toBe(vp1Before + 2);
    expect(G.playerInfo["2"].resources.victoryPoints).toBe(vp2Before + 2);
  });
});

// ── D3: Trade access restriction ─────────────────────────────────────────────

describe("resolveRound — D3: only players with outpost/colony score trade VP", () => {
  it("player without any settlement does not score trade VP even if they have goods", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ mithril: 5 }) }), // lots of goods, no settlement
      buildPlayer("1", { resources: buildResources({ mithril: 1 }) }), // fewer goods, has outpost
    ]);
    G.round = 1;
    // Only player "1" has a settlement
    G.mapState.buildings = [[{
      player: G.playerInfo["1"],
      buildings: "outpost",
      fort: false,
      garrisonedRegiments: 0,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    }]];

    const vp0Before = G.playerInfo["0"].resources.victoryPoints;
    const vp1Before = G.playerInfo["1"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);

    // Player "0" should NOT get any trade VP despite having more goods
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vp0Before);
    // Player "1" should get 1st place VP (only eligible player)
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(vp1Before + 3);
  });
});

// ── D4: Palace bonus ─────────────────────────────────────────────────────────

describe("resolveRound — D4: palace bonus", () => {
  it("player with most palaces scores (their count − 2nd highest) VP", () => {
    const G = buildInitialG([
      buildPlayer("0", { palaces: 4 }),
      buildPlayer("1", { palaces: 2 }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    // 4 − 2 = 2 VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBeGreaterThanOrEqual(vpBefore + 2);
  });

  it("nobody scores palace bonus when tied for most", () => {
    const G = buildInitialG([
      buildPlayer("0", { palaces: 3 }),
      buildPlayer("1", { palaces: 3 }),
    ]);
    const vp0Before = G.playerInfo["0"].resources.victoryPoints;
    const vp1Before = G.playerInfo["1"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vp0Before);
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(vp1Before);
  });

  it("palace bonus is 0 when nobody has any palaces", () => {
    const G = buildInitialG([
      buildPlayer("0", { palaces: 0 }),
      buildPlayer("1", { palaces: 0 }),
    ]);
    const vp0Before = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vp0Before);
  });
});

// ── D5: Factory income ────────────────────────────────────────────────────────

describe("resolveRound — D5: factory income", () => {
  // Helper: create a buildings grid with settlements owned by players and
  // connected to Faithdom. Settlements are placed at Faithdom-adjacent tiles
  // so a single skyship at the tile creates a valid trade route.
  const emptyCell = { buildings: null, player: null, fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
  const emptyLoot = { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 };
  const emptyTile = { name: "Test", blocked: [], sword: 0, shield: 0, type: "land", loot: { outpost: { ...emptyLoot }, colony: { ...emptyLoot } } };
  const makeTileRow = () => Array.from({ length: 8 }, () => ({ ...emptyTile, loot: { outpost: { ...emptyLoot }, colony: { ...emptyLoot } } }));
  const makeSettlement = (type: "outpost" | "colony", playerID: string) => ({
    buildings: type,
    player: { id: playerID },
    fort: false,
    garrisonedRegiments: 0,
    garrisonedLevies: 0,
  });

  // Place a fleet with 1 skyship at (x,y) for a player (so the tile is in their network)
  const addFleetAt = (G: any, playerID: string, x: number, y: number) => {
    G.playerInfo[playerID].fleetInfo.push({
      fleetId: G.playerInfo[playerID].fleetInfo.length,
      location: [x, y], skyships: 1, regiments: 0, levies: 0, eliteRegiments: 0,
    });
  };

  it("player receives gold equal to their factory count (when pool is large enough)", () => {
    const G = buildInitialG([
      buildPlayer("0", { factories: 3, resources: buildResources({ gold: 0 }) }),
      buildPlayer("1", { factories: 1, resources: buildResources({ gold: 0 }) }),
    ]);
    // 8-wide grid, 2 rows. Settlements at known coords so we can connect them.
    // Row 0: Faithdom at [3,0] and [4,0]. Place settlements at [2,0],[5,0],[6,0],[7,0],[1,0].
    // Player "0" owns 3 outposts, player "1" owns 2 colonies.
    const row0 = Array.from({ length: 8 }, () => ({ ...emptyCell }));
    row0[1] = makeSettlement("outpost", "0") as any;
    row0[2] = makeSettlement("outpost", "0") as any;
    row0[5] = makeSettlement("outpost", "0") as any;
    row0[6] = makeSettlement("colony", "1") as any;
    row0[7] = makeSettlement("colony", "1") as any;
    G.mapState.buildings = [row0] as any;
    G.mapState.currentTileArray = [makeTileRow()] as any;

    // Connect player "0"'s settlements to Faithdom via skyships
    addFleetAt(G, "0", 2, 0); // [2,0] → adjacent to Faithdom [3,0]
    addFleetAt(G, "0", 1, 0); // [1,0] → adjacent to [2,0] which reaches Faithdom
    addFleetAt(G, "0", 5, 0); // [5,0] → adjacent to Faithdom [4,0]
    // Connect player "1"'s settlements
    addFleetAt(G, "1", 6, 0); // [6,0] → adjacent to [5,0]... but needs Faithdom path
    addFleetAt(G, "1", 5, 0); // [5,0] → reaches [4,0] (Faithdom)
    addFleetAt(G, "1", 7, 0); // [7,0] → adjacent to [6,0]

    // Pool = 5 settlements; player "0" has 3 factories, 3 routes → eff 3; player "1" has 1 factory, 2 routes → eff 1
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.gold).toBeGreaterThanOrEqual(3);
    expect(G.playerInfo["1"].resources.gold).toBeGreaterThanOrEqual(1);
  });

  it("factory income is capped by pool size (pool can run dry)", () => {
    const G = buildInitialG([
      buildPlayer("0", { factories: 3, resources: buildResources({ gold: 0 }) }),
      buildPlayer("1", { factories: 3, resources: buildResources({ gold: 0 }) }),
    ]);
    // 4 settlements total (pool = 4), both players have 3 factories each
    const row0 = Array.from({ length: 8 }, () => ({ ...emptyCell }));
    row0[2] = makeSettlement("outpost", "0") as any;
    row0[5] = makeSettlement("outpost", "0") as any;
    row0[6] = makeSettlement("outpost", "1") as any;
    row0[7] = makeSettlement("outpost", "1") as any;
    G.mapState.buildings = [row0] as any;
    G.mapState.currentTileArray = [makeTileRow()] as any;

    // Connect all settlements to Faithdom
    addFleetAt(G, "0", 2, 0);
    addFleetAt(G, "0", 5, 0);
    addFleetAt(G, "1", 5, 0);
    addFleetAt(G, "1", 6, 0);
    addFleetAt(G, "1", 7, 0);

    resolveRound(G, stubEvents, stubRandom);
    // Total income distributed = 4 (pool size), not 6 (sum of factories)
    // Player "0" eff factories = min(3, 2 routes) = 2; Player "1" eff = min(3, 2 routes) = 2
    const totalGold = G.playerInfo["0"].resources.gold + G.playerInfo["1"].resources.gold;
    expect(totalGold).toBe(4);
  });
});

// ── D7: Final round gold bonus ────────────────────────────────────────────────

describe("resolveRound — D7: final round gold bonus (1 VP per 5 Gold)", () => {
  it("awards 1 VP per 5 Gold on the final round", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 15 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 7 }) }),
    ]);
    G.round = G.finalRound; // trigger final round
    const vp0Before = G.playerInfo["0"].resources.victoryPoints;
    const vp1Before = G.playerInfo["1"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    // Player "0": floor(15/5) = 3 bonus VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBeGreaterThanOrEqual(vp0Before + 3);
    // Player "1": floor(7/5) = 1 bonus VP
    expect(G.playerInfo["1"].resources.victoryPoints).toBeGreaterThanOrEqual(vp1Before + 1);
  });

  it("does NOT award gold bonus on non-final rounds", () => {
    const G = buildInitialG([
      buildPlayer("0", { palaces: 0, resources: buildResources({ gold: 15 }) }),
    ]);
    G.round = 1;
    G.finalRound = 4;
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    // No gold bonus on round 1
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });
});

// ── D8: Debt penalty ─────────────────────────────────────────────────────────

describe("resolveRound — D8: debt penalty (1 VP per 2 Gold of actual debt)", () => {
  it("deducts 1 VP per 2 Gold when player has negative gold", () => {
    const G = buildInitialG([
      buildPlayer("0", { palaces: 0, resources: buildResources({ gold: -6 }) }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    // debt = 6, penalty = floor(6/2) = 3 VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore - 3);
  });

  it("does NOT deduct VP when gold is exactly 0 (v4.2 fix: zero is not debt)", () => {
    const G = buildInitialG([
      buildPlayer("0", { palaces: 0, resources: buildResources({ gold: 0 }) }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });

  it("does NOT deduct VP when gold is positive", () => {
    const G = buildInitialG([
      buildPlayer("0", { palaces: 0, resources: buildResources({ gold: 5 }) }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    resolveRound(G, stubEvents, stubRandom);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });
});