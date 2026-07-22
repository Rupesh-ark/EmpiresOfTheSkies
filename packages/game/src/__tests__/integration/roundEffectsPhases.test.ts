import { describe, expect, it, vi } from "vitest";
import type { EventsAPI, GoodKey } from "../../types.js";
import {
  factoryIncomePhaseEffects,
  piracyPhaseEffects,
  scoringPhaseEffects,
  sellGoodsPhaseEffects,
  tradePhaseEffects,
} from "../../helpers/resolveRound.js";
import tradePhase from "../../phases/trade.js";
import sellGoodsPhase from "../../phases/sellGoods.js";
import piracyPhase from "../../phases/piracy.js";
import factoryIncomePhase from "../../phases/factoryIncome.js";
import scoringPhase from "../../phases/scoring.js";
import { buildCtx, buildInitialG, buildPlayer, buildResources } from "../testHelpers.js";

const GOODS: GoodKey[] = [
  "mithril",
  "dragonScales",
  "krakenSkin",
  "magicDust",
  "stickyIchor",
  "pipeweed",
];

const PHASES = [
  ["trade", tradePhase],
  ["sellGoods", sellGoodsPhase],
  ["piracy", piracyPhase],
  ["factoryIncome", factoryIncomePhase],
  ["scoring", scoringPhase],
] as const;

describe("round effects phases", () => {
  it("applies rulebook round-effects totals across all five slices", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        hereticOrOrthodox: "heretic",
        heresyTracker: 2,
        palaces: 3,
        resources: buildResources({ gold: 0, victoryPoints: 10, mithril: 2 }),
      }),
      buildPlayer("1", {
        heresyTracker: 0,
        freeDissenters: 2,
        palaces: 1,
        resources: buildResources({ gold: -5, victoryPoints: 10, pipeweed: 1 }),
      }),
    ]);
    G.failedConquests = [{ playerId: "0", tile: [6, 1] }];
    G.mapState.currentTileArray[1][6] = {
      name: "Test Land",
      blocked: [],
      sword: 0,
      shield: 0,
      loot: {
        outpost: {
          gold: 1,
          mithril: 0,
          dragonScales: 0,
          krakenSkin: 0,
          magicDust: 1,
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
      type: "land",
    };
    G.mapState.buildings[1][6] = {
      player: {
        id: "0",
        colour: G.playerInfo["0"].colour,
        kingdomName: G.playerInfo["0"].kingdomName,
      },
      buildings: "outpost",
      fort: [],
      garrisonedRegiments: 0,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    };
    G.mapState.routeSkyships["5,1"] = ["0"];
    const events = { endGame: vi.fn() } as unknown as EventsAPI;
    const random = { Number: () => 0 } as any;

    tradePhaseEffects(G);
    expect(G.failedConquests).toEqual([]);
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(10);
    sellGoodsPhaseEffects(G, random);
    expect(G.tradeGainsThisRound).toEqual({ "0": 3 });
    piracyPhaseEffects(G);
    factoryIncomePhaseEffects(G);
    expect(G.playerInfo["1"].heresyTracker).toBe(0);
    expect(G.playerInfo["1"].freeDissenters).toBe(2);
    scoringPhaseEffects(G, events);

    // P0 gold: 0 + 1 route gold + (3 goods × 2) + 1 factory income = 8.
    expect(G.playerInfo["0"].resources.gold).toBe(8);
    // P1 gold: -5 + (1 good × 2) = -3.
    expect(G.playerInfo["1"].resources.gold).toBe(-3);
    // P0 VP: 10 + 3 trade + 2 heresy + (3 - 1) palace = 17.
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(17);
    // P1: orthodox at tracker 2 after 2 agitator shifts → -2 VP; debt -1 → 7 VP.
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(7);
    expect(G.playerInfo["0"].heresyTracker).toBe(2);
    expect(G.playerInfo["1"].heresyTracker).toBe(2);
    expect(G.playerInfo["1"].freeDissenters).toBe(0);
    Object.values(G.playerInfo).forEach((player) => {
      GOODS.forEach((good) => expect(player.resources[good]).toBe(0));
    });
    expect(G.tradeGainsThisRound).toEqual({});
  });

  it("ends the final round with VP, gold, then turn-order ranking", () => {
    const G = buildInitialG(
      [
        buildPlayer("0", { resources: buildResources({ victoryPoints: 11, gold: 0 }) }),
        buildPlayer("1", { resources: buildResources({ victoryPoints: 9, gold: 9 }) }),
        buildPlayer("2", { resources: buildResources({ victoryPoints: 10, gold: 4 }) }),
        buildPlayer("3", { resources: buildResources({ victoryPoints: 10, gold: 4 }) }),
      ],
      { round: 6, finalRound: 6, turnOrder: ["3", "2", "1", "0"] },
    );
    const endGame = vi.fn();
    const events = { endGame } as unknown as EventsAPI;

    scoringPhaseEffects(G, events);

    expect(endGame).toHaveBeenCalledOnce();
    expect(endGame).toHaveBeenCalledWith({ ranking: ["0", "1", "3", "2"] });
  });

  it.each(PHASES)("%s ends automatically and short-circuits when halted", (_name, phase) => {
    const endPhase = vi.fn();
    const events = { endPhase, endGame: vi.fn() } as unknown as EventsAPI;
    phase.onBegin!({
      G: buildInitialG(),
      ctx: buildCtx("0"),
      events,
      random: { Number: () => 0 },
    } as any);
    expect(endPhase).toHaveBeenCalledOnce();

    const haltedEndPhase = vi.fn();
    phase.onBegin!({
      G: buildInitialG(undefined, { _halted: true }),
      ctx: buildCtx("0"),
      events: { endPhase: haltedEndPhase, endGame: vi.fn() },
      random: { Number: () => 0 },
    } as any);
    expect(haltedEndPhase).not.toHaveBeenCalled();
  });
});
