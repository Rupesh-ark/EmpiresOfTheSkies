import { describe, expect, it, vi } from "vitest";
import { drawFortuneOfWarCard } from "../../helpers/helpers.js";
import { findNextBattle } from "../../helpers/findNext.js";
import {
  resolveBattleAndReturnWinner,
  resolveConquest,
} from "../../helpers/resolveBattle.js";
import attackOtherPlayersFleet from "../../moves/aerialBattle/attackOtherPlayersFleet.js";
import evadeAttackingFleet from "../../moves/aerialBattle/evadeAttackingFleet.js";
import relocateDefeatedFleet from "../../moves/aerialBattle/relocateDefeatedFleet.js";
import type {
  EventsAPI,
  FortuneOfWarCardInfo,
  MyGameState,
} from "../../types.js";
import {
  buildCtx,
  buildFleet,
  buildInitialG,
  buildPlayer,
  buildRandom,
  buildResources,
} from "../testHelpers.js";

const BATTLE: [number, number] = [1, 1];
const NO_EFFECT: FortuneOfWarCardInfo = {
  name: "No Effect",
  sword: 0,
  shield: 0,
};

const stubEvents = () =>
  ({
    endTurn: vi.fn(),
    endPhase: vi.fn(),
  } as unknown as EventsAPI & {
    endTurn: ReturnType<typeof vi.fn>;
    endPhase: ReturnType<typeof vi.fn>;
  });

const setBattleTile = (G: MyGameState, players: string[]): void => {
  G.mapState.currentBattle = [...BATTLE];
  G.mapState.battleMap[BATTLE[1]][BATTLE[0]] = [...players];
  G.mapState.discoveredTiles.forEach((row) => row.fill(true));
};

const buildImprovedTrainingBattle = (
  source: "hand" | "deck"
): MyGameState => {
  const attacker = buildPlayer("0", {
    resources: buildResources({ advantageCard: "improved_training" }),
    fleetInfo: [
      buildFleet(0, {
        location: BATTLE,
        skyships: 3,
        regiments: 1,
      }),
    ],
  });
  const defender = buildPlayer("1", {
    fleetInfo: [buildFleet(0, { location: BATTLE, skyships: 3 })],
  });
  const G = buildInitialG([attacker, defender], { step: "aerial_resolve" });
  setBattleTile(G, ["0", "1"]);
  G.battleState = {
    attacker: {
      ...G.playerInfo["0"],
      decision: "fight",
      fowCard: { name: "Sword 2", sword: 2, shield: 0 },
      fowSource: source,
    },
    defender: {
      ...G.playerInfo["1"],
      decision: "fight",
      fowCard: NO_EFFECT,
      fowSource: "deck",
    },
  };
  return G;
};

describe("Fortunes of War battle conformance", () => {
  it("lets a battle No Effect whiff without redrawing", () => {
    // eots42:636 versus eots42:665 — battle No Effect modifies neither total
    // and reshuffles; only acquiring a hand card redraws.
    const G = buildInitialG();
    const nextCard = { name: "Sword 5", sword: 5, shield: 0 };
    G.cardDecks.fortuneOfWarCards = [NO_EFFECT, nextCard];
    G.cardDecks.discardedFortuneOfWarCards = [
      { name: "Shield 1", sword: 0, shield: 1 },
    ];

    const card = drawFortuneOfWarCard(
      G,
      <T>(cards: T[]) => [...cards],
      { redrawNoEffect: false }
    );

    expect(card).toEqual(NO_EFFECT);
    expect(card.sword + card.shield).toBe(0);
    expect(G.cardDecks.fortuneOfWarCards[0]).toEqual(nextCard);
    expect(G.cardDecks.fortuneOfWarCards).toHaveLength(3);
  });

  it.each([
    ["deck", 7],
    ["hand", 8],
  ] as const)(
    "applies Improved Training correctly to a %s-sourced battle card",
    (source, expectedSwords) => {
      // eots42:665 — Improved Training adds one only to a card played from hand.
      const G = buildImprovedTrainingBattle(source);

      resolveBattleAndReturnWinner(G, stubEvents(), buildCtx("0"));

      expect(G.battleResult?.attackerSwords).toBe(expectedSwords);
    }
  );

  it("applies Improved Training to a hand-sourced conquest card", () => {
    // eots42:665,697 — the hand-only bonus also applies when that hand card is
    // used in a conquest ground battle.
    const attacker = buildPlayer("0", {
      resources: buildResources({ advantageCard: "improved_training" }),
      fleetInfo: [
        buildFleet(0, {
          location: BATTLE,
          skyships: 3,
          regiments: 1,
        }),
      ],
    });
    const G = buildInitialG([attacker, buildPlayer("1")]);
    setBattleTile(G, ["0"]);
    G.mapState.currentTileArray[BATTLE[1]][BATTLE[0]] = {
      name: "Training Ground",
      type: "land",
      blocked: [],
      sword: 1,
      shield: 0,
      loot: {
        outpost: {},
        colony: {},
      },
    } as MyGameState["mapState"]["currentTileArray"][number][number];
    G.mapState.buildings[BATTLE[1]][BATTLE[0]] = {
      fort: [],
      garrisonedRegiments: 0,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    };
    G.conquestState = {
      ...G.playerInfo["0"],
      decision: "fight",
      fowCard: { name: "Sword 2", sword: 2, shield: 0 },
      fowSource: "hand",
    };
    G.cardDecks.fortuneOfWarCards = [NO_EFFECT];
    G.cardDecks.discardedFortuneOfWarCards = [];

    resolveConquest(G, stubEvents(), buildCtx("0"), buildRandom());

    expect(G.battleResult?.attackerSwords).toBe(8);
  });
});

describe("encounter sequencing conformance", () => {
  it("detects a battle exactly at map square (0,0)", () => {
    const G = buildInitialG();
    G.mapState.battleMap[0][0] = ["0", "1"];
    const events = stubEvents();

    findNextBattle(G, events);

    expect(G.mapState.currentBattle).toEqual([0, 0]);
    expect(G.step).toBe("aerial_attack_or_pass");
    expect(events.endTurn).toHaveBeenCalledWith({ next: "0" });
  });

  it("returns serial challenges to the attacker, then advances after all rivals evade", () => {
    // eots42:366 — after each evasion the original attacker may challenge
    // another rival; only after exhausting them does the next player act.
    const players = ["0", "1", "2"].map((id) =>
      buildPlayer(id, {
        fleetInfo: [buildFleet(0, { location: BATTLE, skyships: 1 })],
      })
    );
    const G = buildInitialG(players, {
      step: "aerial_attack_or_pass",
      turnOrder: ["0", "1", "2"],
    });
    setBattleTile(G, ["0", "1", "2"]);
    const events = stubEvents();

    attackOtherPlayersFleet.fn(
      { G, playerID: "0", events } as never,
      "1"
    );
    evadeAttackingFleet.fn(
      { G, ctx: buildCtx("1", 3), playerID: "1", events } as never
    );
    relocateDefeatedFleet.fn(
      { G, ctx: buildCtx("0", 3), playerID: "0", events } as never,
      BATTLE,
      "1"
    );

    expect(G.step).toBe("aerial_attack_or_pass");
    expect(G.possibleDefenders).toEqual(["2"]);
    expect(events.endTurn).toHaveBeenLastCalledWith({ next: "0" });

    attackOtherPlayersFleet.fn(
      { G, playerID: "0", events } as never,
      "2"
    );
    evadeAttackingFleet.fn(
      { G, ctx: buildCtx("2", 3), playerID: "2", events } as never
    );
    relocateDefeatedFleet.fn(
      { G, ctx: buildCtx("0", 3), playerID: "0", events } as never,
      BATTLE,
      "2"
    );

    expect(G.step).toBe("aerial_attack_or_pass");
    expect(events.endTurn).toHaveBeenLastCalledWith({ next: "1" });
    expect(G.aerialChallenges?.pairs).toEqual(["0>1", "0>2"]);
  });
});

describe("failed conquest uplift conformance", () => {
  it("uplifts surviving Levies and Elites as themselves within Skyship capacity", () => {
    // eots42:418,697 — surviving ground troops that fit are uplifted; excess
    // troops return to the pool. Elites still consume one Skyship each.
    const attacker = buildPlayer("0", {
      fleetInfo: [
        buildFleet(0, {
          location: BATTLE,
          skyships: 2,
          regiments: 0,
          levies: 0,
          eliteRegiments: 0,
        }),
      ],
    });
    const G = buildInitialG([attacker, buildPlayer("1")]);
    setBattleTile(G, ["0"]);
    G.mapState.currentTileArray[BATTLE[1]][BATTLE[0]] = {
      name: "Unconquered Land",
      type: "land",
      blocked: [],
      sword: 2,
      shield: 10,
      loot: {
        outpost: {},
        colony: {},
      },
    } as MyGameState["mapState"]["currentTileArray"][number][number];
    G.mapState.buildings[BATTLE[1]][BATTLE[0]] = {
      player: G.playerInfo["0"],
      buildings: "outpost",
      fort: ["fort"],
      garrisonedRegiments: 0,
      garrisonedLevies: 1,
      garrisonedEliteRegiments: 1,
    };
    G.conquestState = {
      ...G.playerInfo["0"],
      decision: "fight",
      fowCard: NO_EFFECT,
      fowSource: "deck",
    };
    G.cardDecks.fortuneOfWarCards = [NO_EFFECT];
    G.cardDecks.discardedFortuneOfWarCards = [];

    resolveConquest(G, stubEvents(), buildCtx("0"), buildRandom());

    expect(G.battleResult?.outcome).toContain("Conquest failed");
    expect(G.playerInfo["0"].fleetInfo[0]).toMatchObject({
      skyships: 2,
      regiments: 0,
      levies: 1,
      eliteRegiments: 1,
    });
    expect(G.mapState.buildings[BATTLE[1]][BATTLE[0]]).toMatchObject({
      player: undefined,
      garrisonedRegiments: 0,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    });
  });
});
