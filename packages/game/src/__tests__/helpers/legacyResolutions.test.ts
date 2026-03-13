/**
 * legacyResolutions.test.ts
 *
 * Tests for all 9 Legacy Card VP bonuses (v4.2, final round).
 *
 *   "the builder"    → +2 VP per cathedral + palace + shipyard + fort owned
 *   "the conqueror"  → +6 VP per colony
 *   "the navigator"  → +4 VP per outpost or colony
 *   "the great"      → +4 VP for each category where player is tied-first or first
 *                      (cathedrals, palaces, skyships, regiments, outposts, colonies, forts, trade goods)
 *   "the magnificent"→ +4 VP per palace
 *   "the merchant"   → +2 VP per goods unit (non-gold, non-VP) at outpost/colony
 *   "the mighty"     → +1 VP per deployed skyship + floor(total regiments/3) + 1 VP per fort
 *   "the aviator"    → +1 VP per skyship (deployed + reserve)
 *   "the pious"      → +4 VP per cathedral
 */

import { describe, it, expect } from "vitest";
import legacyResolutions from "../../helpers/legacyResolutions";
import { buildInitialG, buildPlayer, buildFleet, buildResources } from "../testHelpers";
import type { LegacyCard } from "../../types";

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

function setupPlayer(card: LegacyCard, overrides = {}) {
  const G = buildInitialG([buildPlayer("0", { resources: buildResources({ legacyCard: card, ...overrides as any }), ...overrides as any })]);
  G.mapState = { ...G.mapState, ...buildEmptyMap() };
  return G;
}

describe("Legacy Cards — the builder (+2 per building)", () => {
  it("grants +2 VP per cathedral, palace, shipyard, and fort", () => {
    const G = setupPlayer("the builder");
    G.playerInfo["0"].cathedrals = 2;
    G.playerInfo["0"].palaces = 1;
    G.playerInfo["0"].shipyards = 1;
    // Place a fort on the map
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], fort: true, garrisonedRegiments: 0, garrisonedLevies: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // 2 cathedrals×2 + 1 palace×2 + 1 shipyard×2 + 1 fort×2 = 4+2+2+2 = 10
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 10);
  });
});

describe("Legacy Cards — the conqueror (+6 per colony)", () => {
  it("grants +6 VP per colony", () => {
    const G = setupPlayer("the conqueror");
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], buildings: "colony", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
    G.mapState.buildings[0][1] = { player: G.playerInfo["0"], buildings: "colony", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 12); // 2 colonies × 6
  });

  it("does NOT grant VP for outposts", () => {
    const G = setupPlayer("the conqueror");
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });
});

describe("Legacy Cards — the navigator (+4 per outpost or colony)", () => {
  it("grants +4 VP per outpost AND colony", () => {
    const G = setupPlayer("the navigator");
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
    G.mapState.buildings[0][1] = { player: G.playerInfo["0"], buildings: "colony", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 8); // 2 × 4
  });
});

describe("Legacy Cards — the magnificent (+4 per palace)", () => {
  it("grants +4 VP per palace", () => {
    const G = setupPlayer("the magnificent");
    G.playerInfo["0"].palaces = 3;
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 12); // 3 × 4
  });
});

describe("Legacy Cards — the pious (+4 per cathedral)", () => {
  it("grants +4 VP per cathedral", () => {
    const G = setupPlayer("the pious");
    G.playerInfo["0"].cathedrals = 3;
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 12); // 3 × 4
  });
});

describe("Legacy Cards — the aviator (+1 per skyship, deployed + reserve)", () => {
  it("grants +1 VP per skyship in reserve and in fleets", () => {
    const G = setupPlayer("the aviator");
    G.playerInfo["0"].resources.skyships = 3; // reserve
    G.playerInfo["0"].fleetInfo = [buildFleet(0, { skyships: 2 })]; // deployed
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 5); // 3 + 2
  });
});

describe("Legacy Cards — the mighty", () => {
  it("grants +1 VP per deployed skyship + floor(totalRegiments/3) + 1 per fort", () => {
    const G = setupPlayer("the mighty");
    G.playerInfo["0"].resources.regiments = 6;
    G.playerInfo["0"].fleetInfo = [buildFleet(0, { skyships: 4, regiments: 3 })];
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], fort: true, garrisonedRegiments: 0, garrisonedLevies: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // deployed skyships=4 → +4
    // total regiments = 6 (reserve) + 3 (deployed) = 9 → floor(9/3)=3 → +3
    // forts=1 → +1
    // total = 4+3+1 = 8
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 8);
  });
});

describe("Legacy Cards — the great (+4 per category where player is tied-first)", () => {
  it("grants +4 VP for each category the player leads (or ties for lead)", () => {
    const G = buildInitialG([
      buildPlayer("0", { cathedrals: 3, palaces: 2, resources: buildResources({ skyships: 5, regiments: 8, legacyCard: "the great" }) }),
      buildPlayer("1", { cathedrals: 1, palaces: 1, resources: buildResources({ skyships: 2, regiments: 3 }) }),
    ]);
    G.mapState = { ...G.mapState, ...buildEmptyMap() };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // Player "0" leads in: cathedrals, palaces, skyships, regiments = 4 categories × 4 VP = 16
    // Also tied-first in outposts (0), colonies (0), forts (0), trade goods (0) — all tied at 0 = still +4 each
    // Total: 8 categories × 4 VP = 32
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 32);
  });
});

describe("Legacy Cards — the merchant (+2 per goods unit at settlements)", () => {
  it("grants +2 VP per non-gold, non-VP good at each outpost/colony", () => {
    const mithrilLoot = { gold: 0, mithril: 3, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0 };
    const G = setupPlayer("the merchant");
    G.mapState.currentTileArray[0][0] = {
      name: "test", blocked: [], sword: 0, shield: 0, type: "land",
      loot: { outpost: mithrilLoot, colony: mithrilLoot },
    };
    G.mapState.buildings[0][0] = { player: G.playerInfo["0"], buildings: "outpost", fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    // 3 mithril × 2 = 6 VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 6);
  });
});

describe("Legacy Cards — no card (undefined)", () => {
  it("grants no bonus when player has no legacy card", () => {
    const G = setupPlayer(undefined);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    legacyResolutions(G);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore);
  });
});