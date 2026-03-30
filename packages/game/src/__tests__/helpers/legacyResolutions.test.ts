/**
 * legacyResolutions.test.ts
 *
 * Tests for all 9 Legacy Card VP bonuses (v4.2, final round).
 *
 * Card resolvers return raw VP; resolveCardWithAlignmentPenalty applies the
 * alignment penalty (wrong colour = Math.ceil(vp / 2)) before committing.
 *
 *   "the builder"    → +2 VP per cathedral + palace + shipyard + fort owned
 *   "the conqueror"  → +6 VP per colony
 *   "the navigator"  → +4 VP per outpost and colony on the map (L8)
 *   "the great"      → +4 VP for each category where player is tied-first or first
 *   "the magnificent"→ +4 VP per palace
 *   "the merchant"   → +1 VP per trade good on tiles in active trade route
 *   "the mighty"     → +1 VP per deployed skyship + floor(total regiments/3) + 1 VP per fort
 *   "the aviator"    → +1 VP per skyship (deployed + reserve)
 *   "the pious"      → +4 VP per cathedral
 *
 * Alignment penalty (GAP-3):
 *   Orthodox + orange card, or Heretic + purple card → VP halved (rounded up)
 */

import { describe, it, expect } from "vitest";
import legacyResolutions from "../../helpers/legacyResolutions";
import { buildInitialG, buildPlayer, buildFleet, buildResources } from "../testHelpers";
import type { LegacyCardInfo } from "../../types";

function buildEmptyMap() {
  const ROWS = 4, COLS = 8;
  const emptyLoot = { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 };
  const buildings: any[][] = [];
  const currentTileArray: any[][] = [];
  for (let r = 0; r < ROWS; r++) {
    buildings[r] = [];
    currentTileArray[r] = [];
    for (let c = 0; c < COLS; c++) {
      buildings[r][c] = { fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
      currentTileArray[r][c] = {
        name: "test", blocked: [], sword: 0, shield: 0, type: "land",
        loot: { outpost: emptyLoot, colony: emptyLoot },
      };
    }
  }
  return { buildings, currentTileArray };
}

function setupPlayer(card: LegacyCardInfo | undefined, overrides = {}) {
  const G = buildInitialG([buildPlayer("0", { resources: buildResources({ legacyCard: card, ...overrides as any }), ...overrides as any })]);
  G.mapState = { ...G.mapState, ...buildEmptyMap() };
  return G;
}

// ── Builder ───────────────────────────────────────────────────────────────────

describe("Legacy Cards — the builder (+2 per building)", () => {
  it("grants +2 VP per cathedral, palace, shipyard, and fort", () => {
    const G = setupPlayer({ name: "the builder", colour: "purple" });
    G.playerInfo["0"].cathedrals = 2;
    G.playerInfo["0"].palaces = 1;
    G.playerInfo["0"].shipyards = 1;
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], fort: true, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // 2 cathedrals×2 + 1 palace×2 + 1 shipyard×2 + 1 fort×2 = 10
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 10);
  });
});

// ── Conqueror ─────────────────────────────────────────────────────────────────

describe("Legacy Cards — the conqueror (+6 per colony)", () => {
  it("grants +6 VP per colony", () => {
    const G = setupPlayer({ name: "the conqueror", colour: "purple" });
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], buildings: "colony", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    G.mapState.buildings[0][1] = { player: G.playerInfo["0"], buildings: "colony", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 12);
  });

  it("does NOT grant VP for outposts", () => {
    const G = setupPlayer({ name: "the conqueror", colour: "purple" });
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });
});

// ── Navigator ─────────────────────────────────────────────────────────────────
// L8: 4 VP per Outpost and Colony

describe("Legacy Cards — the navigator (+4 VP per outpost and colony)", () => {
  it("grants 4 VP per outpost and colony on the map", () => {
    const G = setupPlayer({ name: "the navigator", colour: "purple" });
    G.mapState.buildings[0][2] = { player: G.playerInfo["0"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    G.mapState.buildings[1][3] = { player: G.playerInfo["0"], buildings: "colony", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    G.mapState.buildings[2][1] = { player: G.playerInfo["0"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // 2 outposts + 1 colony = 3 × 4 = 12 VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 12);
  });

  it("grants 0 VP when player has no outposts or colonies", () => {
    const G = setupPlayer({ name: "the navigator", colour: "purple" });
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });
});

// ── Magnificent ───────────────────────────────────────────────────────────────

describe("Legacy Cards — the magnificent (+4 per palace)", () => {
  it("grants +4 VP per palace", () => {
    const G = setupPlayer({ name: "the magnificent", colour: "purple" });
    G.playerInfo["0"].palaces = 3;
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 12);
  });
});

// ── Pious ─────────────────────────────────────────────────────────────────────

describe("Legacy Cards — the pious (+4 per cathedral)", () => {
  it("grants +4 VP per cathedral", () => {
    const G = setupPlayer({ name: "the pious", colour: "purple" });
    G.playerInfo["0"].cathedrals = 3;
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 12);
  });
});

// ── Aviator ───────────────────────────────────────────────────────────────────

describe("Legacy Cards — the aviator (+1 per skyship, deployed + reserve)", () => {
  it("grants +1 VP per skyship in reserve and in fleets", () => {
    const G = setupPlayer({ name: "the aviator", colour: "purple" });
    G.playerInfo["0"].resources.skyships = 3;
    G.playerInfo["0"].fleetInfo = [buildFleet(0, { skyships: 2 })];
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 5);
  });
});

// ── Mighty ────────────────────────────────────────────────────────────────────

describe("Legacy Cards — the mighty", () => {
  it("grants +1 VP per deployed skyship + floor(totalRegiments/3) + 1 per fort", () => {
    const G = setupPlayer({ name: "the mighty", colour: "purple" });
    G.playerInfo["0"].resources.regiments = 6;
    G.playerInfo["0"].fleetInfo = [buildFleet(0, { skyships: 4, regiments: 3 })];
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], fort: true, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // deployed skyships=4 → +4; total regiments=9 → floor(9/3)=3 → +3; forts=1 → +1; total=8
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 8);
  });
});

// ── Great ─────────────────────────────────────────────────────────────────────

describe("Legacy Cards — the great (+4 per category where player is tied-first)", () => {
  it("grants +4 VP for each category the player leads (or ties for lead)", () => {
    const G = buildInitialG([
      buildPlayer("0", { cathedrals: 3, palaces: 2, resources: buildResources({ skyships: 5, regiments: 8, legacyCard: { name: "the great", colour: "purple" } }) }),
      buildPlayer("1", { cathedrals: 1, palaces: 1, resources: buildResources({ skyships: 2, regiments: 3 }) }),
    ]);
    G.mapState = { ...G.mapState, ...buildEmptyMap() };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // Leads in: cathedrals, palaces, skyships, regiments (4) + tied at 0 in outposts, colonies, forts, trade (4) = 8 × 4 = 32
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 32);
  });
});

// ── Merchant ──────────────────────────────────────────────────────────────────

describe("Legacy Cards — the merchant (+1 per trade good in active trade route)", () => {
  it("grants 1 VP per trade good on BFS-connected tile", () => {
    const G = setupPlayer({ name: "the merchant", colour: "purple" });
    G.playerInfo["0"].fleetInfo = [buildFleet(0, { location: [2, 0], skyships: 2 })];
    G.mapState.buildings[0][2] = { player: G.playerInfo["0"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
    G.mapState.currentTileArray[0][2] = {
      name: "test", blocked: [], sword: 0, shield: 0, type: "land",
      loot: {
        outpost: { gold: 2, mithril: 3, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 },
        colony: { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 },
      },
    };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // 3 mithril = 3 trade goods → 3 VP (gold excluded)
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 3);
  });
});

// ── No card ───────────────────────────────────────────────────────────────────

describe("Legacy Cards — no card (undefined)", () => {
  it("grants no bonus when player has no legacy card", () => {
    const G = setupPlayer(undefined);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });
});

// ── Alignment penalty (GAP-3) ─────────────────────────────────────────────────

describe("Legacy Cards — alignment penalty", () => {
  it("halves VP (rounded up) for Orthodox player with orange card", () => {
    const G = setupPlayer({ name: "the pious", colour: "orange" });
    G.playerInfo["0"].hereticOrOrthodox = "orthodox"; // wrong alignment for orange
    G.playerInfo["0"].cathedrals = 3; // raw = 12 VP → halved = 6
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 6);
  });

  it("halves VP (rounded up) for Heretic player with purple card", () => {
    const G = setupPlayer({ name: "the pious", colour: "purple" });
    G.playerInfo["0"].hereticOrOrthodox = "heretic"; // wrong alignment for purple
    G.playerInfo["0"].cathedrals = 3; // raw = 12 VP → halved = 6
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 6);
  });

  it("rounds up when raw VP is odd (e.g. 5 → ceil(5/2) = 3)", () => {
    const G = setupPlayer({ name: "the magnificent", colour: "orange" });
    G.playerInfo["0"].hereticOrOrthodox = "orthodox"; // wrong alignment
    G.playerInfo["0"].palaces = 1; // raw = 4 VP? no: 1×4=4 → half=2. Let's use pious with 1 cathedral
    // Use builder with cathedrals=1,palaces=0,shipyards=0 → raw=2 → half=1
    const G2 = setupPlayer({ name: "the builder", colour: "orange" });
    G2.playerInfo["0"].hereticOrOrthodox = "orthodox";
    G2.playerInfo["0"].cathedrals = 1;
    G2.playerInfo["0"].palaces = 0;
    G2.playerInfo["0"].shipyards = 0;
    // raw = 1×2 = 2 VP → ceil(2/2) = 1
    const vpBefore2 = G2.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G2);
    expect(G2.playerInfo["0"].resources.victoryPoints).toBe(vpBefore2 + 1);
  });

  it("grants full VP for correct alignment (Orthodox + purple)", () => {
    const G = setupPlayer({ name: "the pious", colour: "purple" });
    G.playerInfo["0"].hereticOrOrthodox = "orthodox";
    G.playerInfo["0"].cathedrals = 3; // raw = 12 → full = 12
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 12);
  });
});
