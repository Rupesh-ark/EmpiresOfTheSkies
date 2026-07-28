import { describe, expect, it, vi } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import type {
  EventsAPI,
  FortuneOfWarCardInfo,
  InfidelHostCounter,
  MyGameState,
  RandomAPI,
} from "../../types.js";
import { getBattleEventTarget } from "../../helpers/eventCardDefinitions.js";
import {
  resolveRebellionWithTroopsAndRivals,
  setupNextRebellion,
} from "../../helpers/resolveRebellion.js";
import { setupNextDeferredBattle } from "../../helpers/resolutionFlow.js";
import { countActiveTradeRoutes, claimsConnectedAfterPlacement } from "../../helpers/mapUtils.js";
import { CARD_RESOLVERS } from "../../helpers/legacyCardDefinitions.js";
import { findNextGroundBattle } from "../../helpers/findNext.js";
import commitOccupationBattleCard from "../../moves/groundBattle/commitOccupationBattleCard.js";
import garrisonTroops from "../../moves/groundBattle/garrisonTroops.js";
import commitDeferredBattleCard from "../../moves/events/commitDeferredBattleCard.js";
import commitRebellionTroops from "../../moves/events/commitRebellionTroops.js";
import contributeToRebellion from "../../moves/events/contributeToRebellion.js";
import acceptRebellionSupport from "../../moves/events/acceptRebellionSupport.js";
import garrisonTransfer from "../../moves/actions/garrisonTransfer.js";
import checkAndPlaceFort from "../../moves/actions/checkAndPlaceFort.js";
import foundBuildings from "../../moves/actions/foundBuildings.js";
import transferOutpost from "../../moves/actions/transferOutpost.js";
import { enumerateLegalMoves } from "../../ai/enumerate.js";
import { MyGame } from "../../Game.js";
import {
  buildCtx,
  buildFleet,
  buildInitialG,
  buildPlayer,
  buildRandom,
  buildResources,
} from "../testHelpers.js";

const TILE: [number, number] = [2, 0];

const card = (
  name: string,
  sword: number,
  shield: number
): FortuneOfWarCardInfo => ({ name, sword, shield });

const stubEvents = () =>
  ({
    endTurn: vi.fn(),
    endPhase: vi.fn(),
  } as unknown as EventsAPI & {
    endTurn: ReturnType<typeof vi.fn>;
    endPhase: ReturnType<typeof vi.fn>;
  });

const moveContext = (
  G: MyGameState,
  playerID: string,
  playOrder: string[],
  events = stubEvents(),
  random: RandomAPI = buildRandom()
) => ({
  G,
  ctx: {
    ...buildCtx(playerID, playOrder.length),
    playOrder,
    currentPlayer: playerID,
  },
  playerID,
  events,
  random,
});

const placeColony = (
  G: MyGameState,
  ownerID: string,
  garrison: {
    regiments?: number;
    levies?: number;
    elites?: number;
  } = {}
): void => {
  const [x, y] = TILE;
  G.mapState.currentTileArray[y][x].type = "land";
  G.mapState.buildings[y][x] = {
    player: G.playerInfo[ownerID],
    buildings: "colony",
    fort: [],
    garrisonedRegiments: garrison.regiments ?? 0,
    garrisonedLevies: garrison.levies ?? 0,
    garrisonedEliteRegiments: garrison.elites ?? 0,
  };
};

describe("rebellion event targeting", () => {
  it("targets the lowest (leftmost) heretic tracker, breaking ties IPO", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        hereticOrOrthodox: "heretic",
        heresyTracker: 2,
      }),
      buildPlayer("1", {
        hereticOrOrthodox: "heretic",
        heresyTracker: -4,
      }),
      buildPlayer("2", {
        hereticOrOrthodox: "heretic",
        heresyTracker: -4,
      }),
    ]);

    expect(
      getBattleEventTarget(
        "orthodox_rebellion",
        G,
        ["2", "1", "0"]
      )?.targetPlayerID
    ).toBe("2");
  });

  it("lets the fewest-VP chooser mark a colony owned by anyone", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ victoryPoints: 1 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ victoryPoints: 9 }),
      }),
    ]);
    placeColony(G, "1");

    expect(
      getBattleEventTarget(
        "colonial_rebellion",
        G,
        ["0", "1"]
      )
    ).toMatchObject({
      targetPlayerID: "1",
      chooserPlayerID: "0",
      targetTile: TILE,
    });
  });
});

describe("Colonial REBELLION ground resolution", () => {
  it("uses the colony garrison and leaves the owner's Kingdom pool untouched", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ regiments: 6 }),
      }),
      buildPlayer("1"),
    ]);
    placeColony(G, "0", { regiments: 1 });
    G.contingentPool = [1];
    G.cardDecks.fortuneOfWarCards = [
      card("rebel shield", 0, 1),
      card("garrison sword", 5, 0),
    ];
    G.eventState.deferredEvents = [
      {
        card: "colonial_rebellion",
        targetPlayerID: "0",
        targetTile: TILE,
        chooserPlayerID: "1",
      },
    ];
    const events = stubEvents();

    expect(setupNextRebellion(G)).toBe(false);
    expect(G.eventState.deferredEvents).toHaveLength(1);
    expect(setupNextDeferredBattle(G, events)).toBe(true);
    expect(G.step).toBe("deferred_battle");

    const kingdomBefore =
      G.playerInfo["0"].resources.regiments;
    commitDeferredBattleCard.fn(
      moveContext(G, "0", ["0", "1"], events),
      undefined
    );

    expect(G.battleResult?.battleType).toBe(
      "Colonial Rebellion"
    );
    expect(G.battleResult?.defenderSwords).toBe(2);
    expect(G.playerInfo["0"].resources.regiments).toBe(
      kingdomBefore
    );
    expect(
      G.mapState.buildings[TILE[1]][TILE[0]]
        .garrisonedRegiments
    ).toBe(1);
  });

  it("allows the colony owner to refuse the sole rival Fleet and fight alone", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1", {
        fleetInfo: [
          buildFleet(0, {
            location: TILE,
            skyships: 3,
            regiments: 2,
          }),
        ],
      }),
    ]);
    placeColony(G, "0", { levies: 1 });
    G.mapState.battleMap[TILE[1]][TILE[0]] = ["1"];
    G.contingentPool = [1];
    G.cardDecks.fortuneOfWarCards = [
      card("rebel shield", 0, 1),
      card("garrison sword", 5, 0),
    ];
    G.eventState.deferredEvents = [
      {
        card: "colonial_rebellion",
        targetPlayerID: "0",
        targetTile: TILE,
      },
    ];
    const events = stubEvents();
    setupNextDeferredBattle(G, events);

    contributeToRebellion.fn(
      moveContext(G, "1", ["0", "1"], events),
      "defender",
      0,
      0
    );
    expect(G.step).toBe("rebellion_accept_support");
    const fleetBefore = {
      ...G.playerInfo["1"].fleetInfo[0],
    };

    acceptRebellionSupport.fn(
      moveContext(G, "0", ["0", "1"], events),
      false
    );
    expect(G.step).toBe("deferred_battle");

    commitDeferredBattleCard.fn(
      moveContext(G, "0", ["0", "1"], events),
      undefined
    );
    expect(G.battleResult?.defenderSwords).toBe(1);
    expect(G.playerInfo["1"].fleetInfo[0]).toMatchObject(
      fleetBefore
    );
  });

  it("AI enumerates both accept and refuse decisions", () => {
    const G = buildInitialG();
    G.step = "rebellion_accept_support";
    G.currentRebellion = {
      event: {
        card: "pretender_rebellion",
        targetPlayerID: "0",
      },
      counterSwords: 3,
      rivalContributions: {},
    };
    const ctx = {
      ...buildCtx("0"),
      phase: "rebellions",
    };

    expect(enumerateLegalMoves(G, ctx, "0")).toEqual(
      expect.arrayContaining([
        {
          move: "acceptRebellionSupport",
          args: [true],
        },
        {
          move: "acceptRebellionSupport",
          args: [false],
        },
      ])
    );
  });
});

describe("rebellion casualties", () => {
  it("ranks the committed defender with allies by size and returns all survivors", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ levies: 1, regiments: 4 }),
      }),
      buildPlayer("1", {
        resources: buildResources({ levies: 0 }),
      }),
      buildPlayer("2", {
        resources: buildResources({ levies: 0 }),
      }),
    ]);
    G.cardDecks.fortuneOfWarCards = [
      card("rebel shield", 0, 1),
      card("defender shield", 0, 1),
    ];
    G.currentRebellion = {
      event: {
        card: "peasant_rebellion",
        targetPlayerID: "0",
      },
      counterSwords: 5,
      defenderRegiments: 0,
      defenderLevies: 1,
      defenderSkyships: 0,
      defenderEliteRegiments: 0,
      rivalContributions: {
        "1": {
          side: "defender",
          regiments: 0,
          levies: 3,
          skyships: 0,
          eliteRegiments: 0,
          source: "kingdom",
        },
        "2": {
          side: "defender",
          regiments: 0,
          levies: 2,
          skyships: 0,
          eliteRegiments: 0,
          source: "kingdom",
        },
      },
    };

    resolveRebellionWithTroopsAndRivals(
      G,
      G.currentRebellion,
      buildRandom().Shuffle
    );

    expect(G.playerInfo["0"].resources.levies).toBe(1);
    expect(G.playerInfo["0"].resources.regiments).toBe(4);
    expect(G.playerInfo["1"].resources.levies).toBe(0);
    expect(G.playerInfo["2"].resources.levies).toBe(1);
  });

  it("lets a committed Kingdom Skyship absorb one hit and deducts the real piece", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({
          skyships: 3,
          regiments: 4,
        }),
      }),
    ]);
    G.currentRebellion = {
      event: {
        card: "peasant_rebellion",
        targetPlayerID: "0",
      },
      counterSwords: 2,
    };
    G.cardDecks.fortuneOfWarCards = [
      card("rebel shield", 0, 1),
      card("defender sword", 5, 0),
    ];
    const events = stubEvents();

    commitRebellionTroops.fn(
      moveContext(G, "0", ["0"], events),
      0,
      0,
      1,
      undefined
    );

    expect(G.playerInfo["0"].resources.skyships).toBe(2);
    expect(G.playerInfo["0"].resources.regiments).toBe(4);
    expect(G.battleResult?.winner).toBe("Angland");
  });
});

describe("rebel occupation and retaking", () => {
  it("blocks routes and building Legacy scoring, then returns a retaken Rebel counter through Shuffle", () => {
    const G = buildInitialG();
    placeColony(G, "0");
    const building =
      G.mapState.buildings[TILE[1]][TILE[0]];
    expect(countActiveTradeRoutes(G, "0")).toBe(1);
    expect(
      CARD_RESOLVERS["the conqueror"](
        G.playerInfo["0"],
        G
      )
    ).toBe(6);

    building.rebelCounter = {
      kind: "rebels",
      swords: 1,
    };
    expect(countActiveTradeRoutes(G, "0")).toBe(0);
    expect(
      claimsConnectedAfterPlacement(G, "0", [])
    ).toEqual({ before: 0, after: 0, total: 0 });
    expect(
      CARD_RESOLVERS["the conqueror"](
        G.playerInfo["0"],
        G
      )
    ).toBe(0);
    expect(
      CARD_RESOLVERS["the navigator"](
        G.playerInfo["0"],
        G
      )
    ).toBe(0);

    G.playerInfo["0"].fleetInfo = [
      buildFleet(0, {
        location: TILE,
        skyships: 3,
        regiments: 1,
      }),
    ];
    G.mapState.battleMap[TILE[1]][TILE[0]] = ["0"];
    G.cardDecks.fortuneOfWarCards = [
      card("attacker sword", 5, 0),
      card("counter shield", 0, 1),
    ];
    G.contingentPool = [7];
    const shuffle = vi.fn(<T>(items: T[]) => [...items].reverse());
    const random = { Shuffle: shuffle } as unknown as RandomAPI;
    const events = stubEvents();
    findNextGroundBattle(G, events);

    commitOccupationBattleCard.fn(
      moveContext(G, "0", ["0", "1"], events, random),
      undefined
    );

    expect(building.rebelCounter).toBeUndefined();
    expect(building.player?.id).toBe("0");
    expect(G.contingentPool).toEqual([1, 7]);
    expect(shuffle).toHaveBeenCalled();
    expect(G.step).toBe("ground_garrison");
    expect(G.battleState?.attacker).toMatchObject({
      id: "0",
      victorious: true,
    });

    const result = garrisonTroops.fn(
      moveContext(G, "0", ["0", "1"], events),
      [1, 0, 0]
    );
    expect(result).not.toBe(INVALID_MOVE);
    expect(building.garrisonedRegiments).toBe(1);
    expect(G.playerInfo["0"].fleetInfo[0].regiments).toBe(0);
  });

  it("lets the arriving Fleet pass without consuming a card and advances the scan", () => {
    const G = buildInitialG();
    placeColony(G, "0");
    const building =
      G.mapState.buildings[TILE[1]][TILE[0]];
    building.rebelCounter = {
      kind: "rebels",
      swords: 1,
    };
    G.playerInfo["0"].fleetInfo = [
      buildFleet(0, {
        location: TILE,
        skyships: 3,
        regiments: 1,
      }),
    ];
    G.playerInfo["0"].resources.fortuneCards = [
      card("held card", 2, 2),
    ];
    G.mapState.battleMap[TILE[1]][TILE[0]] = ["0"];
    const events = stubEvents();
    findNextGroundBattle(G, events);

    const ctx = {
      ...buildCtx("0"),
      phase: "groundBattles",
    };
    expect(enumerateLegalMoves(G, ctx, "0")).toEqual(
      expect.arrayContaining([
        {
          move: "commitOccupationBattleCard",
          args: ["pass"],
        },
        {
          move: "commitOccupationBattleCard",
          args: [0],
        },
      ])
    );

    commitOccupationBattleCard.fn(
      moveContext(G, "0", ["0", "1"], events),
      "pass"
    );

    expect(G.playerInfo["0"].resources.fortuneCards).toEqual([
      card("held card", 2, 2),
    ]);
    expect(building.rebelCounter).toEqual({
      kind: "rebels",
      swords: 1,
    });
    expect(G.currentOccupationBattle).toBeNull();
    expect(G.mapState.currentBattle).toEqual([-1, 0]);
    expect(events.endPhase).toHaveBeenCalled();
  });

  it("preserves and returns a seized Infidel Fleet counter instead of leaking it", () => {
    const G = buildInitialG();
    placeColony(G, "1");
    const fleetCounter: InfidelHostCounter = {
      swords: 1,
      shields: 0,
      isFleet: true,
      isInvasionTrigger: false,
    };
    const otherHost: InfidelHostCounter = {
      swords: 4,
      shields: 1,
      isFleet: false,
      isInvasionTrigger: false,
    };
    G.mapState.buildings[TILE[1]][TILE[0]].rebelCounter = {
      kind: "infidel_host",
      counter: fleetCounter,
    };
    G.playerInfo["0"].fleetInfo = [
      buildFleet(0, {
        location: TILE,
        skyships: 3,
      }),
    ];
    G.mapState.battleMap[TILE[1]][TILE[0]] = ["0"];
    G.cardDecks.fortuneOfWarCards = [
      card("attacker sword", 5, 0),
      card("counter shield", 0, 1),
    ];
    G.infidelHostPool = [otherHost];
    const shuffle = vi.fn(<T>(items: T[]) => [...items].reverse());
    const random = { Shuffle: shuffle } as unknown as RandomAPI;
    const events = stubEvents();
    findNextGroundBattle(G, events);

    commitOccupationBattleCard.fn(
      moveContext(G, "0", ["0", "1"], events, random),
      undefined
    );

    expect(G.infidelHostPool).toEqual([
      fleetCounter,
      otherHost,
    ]);
    expect(
      G.infidelHostPool.filter((counter) => counter.isFleet)
    ).toHaveLength(1);
    expect(shuffle).toHaveBeenCalled();
  });
});

describe("rebel-occupied owner actions", () => {
  it("rejects garrison transfers to and from the occupied building", () => {
    const G = buildInitialG();
    placeColony(G, "0", { regiments: 1 });
    const building =
      G.mapState.buildings[TILE[1]][TILE[0]];
    building.rebelCounter = {
      kind: "rebels",
      swords: 1,
    };
    G.playerInfo["0"].fleetInfo = [
      buildFleet(0, {
        location: TILE,
        skyships: 3,
        regiments: 1,
      }),
    ];

    expect(
      garrisonTransfer.validate?.(
        G,
        "0",
        0,
        TILE,
        1,
        0,
        0
      )
    ).toMatchObject({ code: "NO_BUILDING" });
    expect(
      garrisonTransfer.validate?.(
        G,
        "0",
        0,
        TILE,
        -1,
        0,
        0
      )
    ).toMatchObject({ code: "NO_BUILDING" });
  });

  it("rejects fort founding and placement on the occupied building", () => {
    const G = buildInitialG();
    placeColony(G, "0", { regiments: 1 });
    G.mapState.buildings[TILE[1]][TILE[0]].rebelCounter = {
      kind: "rebels",
      swords: 1,
    };

    expect(
      foundBuildings.validate?.(G, "0", 3)
    ).toMatchObject({ code: "NO_VALID_FORT_TILE" });
    expect(
      checkAndPlaceFort.validate?.(G, "0", TILE)
    ).toMatchObject({ code: "INVALID_FORT_PLACEMENT" });
  });

  it("rejects transfer validation for the occupied building", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1", {
        fleetInfo: [
          buildFleet(0, {
            location: TILE,
            skyships: 3,
          }),
        ],
      }),
    ]);
    placeColony(G, "0");
    G.mapState.buildings[TILE[1]][TILE[0]].rebelCounter = {
      kind: "rebels",
      swords: 1,
    };

    expect(
      transferOutpost.validate?.(G, "0", TILE, "1")
    ).toMatchObject({ code: "TRANSFER_FAILED" });
  });
});

describe("Peasant REBELLION tax effect", () => {
  it("skips only the targeted player's Gather Taxes", () => {
    const G = buildInitialG();
    G.eventState.skipTaxesNextRound = ["1"];
    const before0 = G.playerInfo["0"].resources.gold;
    const before1 = G.playerInfo["1"].resources.gold;
    const events = stubEvents();
    const ctx = {
      ...buildCtx("0"),
      playOrder: ["0", "1"],
    };

    MyGame.phases!.taxes.onBegin!({
      G,
      ctx,
      events,
    } as never);

    expect(G.playerInfo["0"].resources.gold).toBeGreaterThan(
      before0
    );
    expect(G.playerInfo["1"].resources.gold).toBe(before1);
    expect(G.eventState.skipTaxesNextRound).toEqual([]);
  });
});
