/**
 * conquests.test.ts
 *
 * Tests for conquest mechanics (v4.2).
 *
 * Covers:
 *   - constructOutpost: places outpost, grants +1 VP, heresy +1, sets garrison stage
 *     NOTE: goods are no longer granted on claim (GAP-RES1) — they recur via trade routes each round
 *   - coloniseLand: sets up conquestState, advances to "conquest draw or pick card"
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import constructOutpost from "../../moves/conquests/constructOutpost";
import coloniseLand from "../../moves/conquests/coloniseLand";
import { buildInitialG, buildPlayer, buildCtx } from "../testHelpers";

const stubEvents = { endTurn: () => {}, endPhase: () => {} } as any;

function buildMapWithLoot(outpostLoot: Record<string, number>) {
  const ROWS = 4, COLS = 8;
  const currentTileArray: any[][] = [];
  const buildings: any[][] = [];
  const discoveredTiles: boolean[][] = [];
  const loot = { gold: 0, mithril: 0, dragonScales: 0, krakenSkin: 0, magicDust: 0, stickyIchor: 0, pipeweed: 0, victoryPoints: 0, ...outpostLoot };
  for (let r = 0; r < ROWS; r++) {
    currentTileArray[r] = [];
    buildings[r] = [];
    discoveredTiles[r] = [];
    for (let c = 0; c < COLS; c++) {
      currentTileArray[r][c] = {
        name: "test", blocked: [], sword: 0, shield: 0, type: "land",
        loot: { outpost: loot, colony: loot },
      };
      buildings[r][c] = { fort: false, garrisonedRegiments: 0, garrisonedLevies: 0 };
      discoveredTiles[r][c] = r === 0 && c === 0;
    }
  }
  const battleMap: string[][][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => [])
  );
  return { currentTileArray, buildings, discoveredTiles, battleMap };
}

// ── constructOutpost ──────────────────────────────────────────────────────────

describe("constructOutpost — placing an outpost", () => {
  it("sets building type to 'outpost' at currentBattle tile", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.mapState.buildings[0][0].buildings).toBe("outpost");
  });

  it("assigns the building to the player", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.mapState.buildings[0][0].player?.id).toBe("0");
  });

  it("grants +1 VP", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 1);
  });

  it("advances heresyTracker by 1", () => {
    const G = buildInitialG([buildPlayer("0", { heresyTracker: 5 })]);
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.playerInfo["0"].heresyTracker).toBe(6);
  });

  it("does NOT grant tile loot resources immediately (GAP-RES1: goods come from trade routes each round)", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({ mithril: 2, gold: 3 }) };
    G.mapState.currentBattle = [0, 0];
    const goldBefore = G.playerInfo["0"].resources.gold;
    const mithrilBefore = G.playerInfo["0"].resources.mithril;
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    // Goods are no longer granted at claim time — they recur via grantTradeRouteGoods in resolveRound
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore);
    expect(G.playerInfo["0"].resources.mithril).toBe(mithrilBefore);
  });

  it("sets stage to 'garrison troops'", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.stage).toBe("garrison troops");
  });

  it("decreases mithril price marker by loot quantity (min 1)", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({ mithril: 2 }) };
    G.mapState.currentBattle = [0, 0];
    const markerBefore = G.mapState.goodsPriceMarkers.mithril; // default 2
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    // marker = max(1, 2 - 2) = max(1, 0) = 1
    expect(G.mapState.goodsPriceMarkers.mithril).toBe(Math.max(1, markerBefore - 2));
  });

  it("does not decrease price marker below 1", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({ dragonScales: 5 }) };
    G.mapState.currentBattle = [0, 0];
    G.mapState.goodsPriceMarkers.dragonScales = 3;
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    // marker = max(1, 3 - 5) = max(1, -2) = 1
    expect(G.mapState.goodsPriceMarkers.dragonScales).toBe(1);
  });

  it("does not change price marker when loot quantity is 0", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({ mithril: 0 }) };
    G.mapState.currentBattle = [0, 0];
    G.mapState.goodsPriceMarkers.mithril = 5;
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (constructOutpost as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.mapState.goodsPriceMarkers.mithril).toBe(5);
  });
});

// ── coloniseLand ─────────────────────────────────────────────────────────────

describe("coloniseLand — initiating a colonisation attempt", () => {
  it("sets conquestState with decision=fight", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (coloniseLand as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.conquestState?.decision).toBe("fight");
  });

  it("sets stage to 'conquest draw or pick card'", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (coloniseLand as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.stage).toBe("conquest draw or pick card");
  });

  it("returns INVALID_MOVE if another player owns a building at the tile", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    G.mapState.buildings[0][0].buildings = "outpost";
    G.mapState.buildings[0][0].player = G.playerInfo["1"];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    const result = (coloniseLand as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(result).toBe(INVALID_MOVE);
  });

  it("allows coloniseLand when own outpost is at the tile", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    G.mapState.buildings[0][0].buildings = "outpost";
    G.mapState.buildings[0][0].player = G.playerInfo["0"];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (coloniseLand as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.stage).toBe("conquest draw or pick card");
  });

  it("returns INVALID_MOVE if player already failed conquest at this tile this round", () => {
    const G = buildInitialG();
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    G.failedConquests = [{ playerId: "0", tile: [0, 0] }];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    const result = (coloniseLand as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(result).toBe(INVALID_MOVE);
  });

  it("allows coloniseLand if a different player failed at the same tile", () => {
    const G = buildInitialG([buildPlayer("0"), buildPlayer("1")]);
    G.mapState = { ...G.mapState, ...buildMapWithLoot({}) };
    G.mapState.currentBattle = [0, 0];
    G.failedConquests = [{ playerId: "1", tile: [0, 0] }];
    const ctx = { ...buildCtx("0"), currentPlayer: "0" };
    (coloniseLand as Function)({ G, ctx, playerID: "0", events: stubEvents, random: {} });
    expect(G.stage).toBe("conquest draw or pick card");
  });
});