import { describe, expect, it } from "vitest";
import { KINGDOM_LOCATION, MAX_SKYSHIPS_PER_FLEET } from "../../data/gameData.js";
import { MOVE_DEFINITIONS } from "../../moveDefinitions.js";
import type { MyGameState } from "../../types.js";
import {
  buildCtx,
  buildEvents,
  buildFleet,
  buildInitialG,
  buildPlayer,
  buildRandom,
  buildResources,
  callMoveDef,
} from "../testHelpers.js";

const DESTINATION: [number, number] = [5, 0];

function buildDeployState(): MyGameState {
  const G = buildInitialG([
    buildPlayer("0", {
      resources: buildResources({
        gold: 10,
        counsellors: 4,
        skyships: 6,
        regiments: 4,
        levies: 2,
        eliteRegiments: 2,
      }),
      fleetInfo: [
        buildFleet(0, {
          location: [...KINGDOM_LOCATION],
          skyships: 0,
          regiments: 0,
          levies: 0,
          eliteRegiments: 0,
        }),
      ],
    }),
    buildPlayer("1"),
  ]);
  G.mapState.discoveredTiles[DESTINATION[1]][DESTINATION[0]] = true;
  return G;
}

function expectRejectedWithoutMutation(
  moveName: keyof typeof MOVE_DEFINITIONS,
  G: MyGameState,
  playerID: string,
  ...args: unknown[]
): void {
  const before = structuredClone(G);
  const { result } = callMoveDef(MOVE_DEFINITIONS[moveName], G, playerID, ...args);
  expect(result).toBe("INVALID_MOVE");
  expect(G).toEqual(before);
}

describe("server validation — deployFleet", () => {
  it("rejects remote re-arming without changing state", () => {
    const G = buildDeployState();
    G.playerInfo["0"].fleetInfo[0].location = [2, 2];
    G.playerInfo["0"].fleetInfo[0].skyships = 1;

    expect(MOVE_DEFINITIONS.deployFleet.validate?.(
      G, "0", 0, DESTINATION, 2, 1, 0, 0
    )).toMatchObject({ code: "FLEET_NOT_AT_HOME" });
    expectRejectedWithoutMutation("deployFleet", G, "0", 0, DESTINATION, 2, 1, 0, 0);
  });

  it("treats an elite-only fleet as laden when checking mountain crossings", () => {
    const G = buildDeployState();
    G.mapState.currentTileArray[0][4].blocked = ["E"];

    expect(MOVE_DEFINITIONS.deployFleet.validate?.(
      G, "0", 0, DESTINATION, 1, 0, 0, 1
    )).toMatchObject({ code: "INVALID_DESTINATION" });
    expectRejectedWithoutMutation("deployFleet", G, "0", 0, DESTINATION, 1, 0, 0, 1);
  });

  it.each([
    {
      label: "a fractional composition",
      args: [0, DESTINATION, 1.5, 0, 0, 0],
      code: "INVALID_COUNT",
    },
    {
      label: "a negative composition",
      args: [0, DESTINATION, 1, -1, 0, 0],
      code: "INVALID_COUNT",
    },
    {
      label: "too many skyships",
      args: [0, DESTINATION, MAX_SKYSHIPS_PER_FLEET + 1, 0, 0, 0],
      code: "FLEET_SIZE_EXCEEDED",
    },
    {
      label: "more troops than skyships",
      args: [0, DESTINATION, 1, 1, 1, 0],
      code: "TROOP_CAPACITY_EXCEEDED",
    },
  ])("rejects $label", ({ args, code }) => {
    const G = buildDeployState();
    expect(MOVE_DEFINITIONS.deployFleet.validate?.(G, "0", ...args)).toMatchObject({ code });
    expectRejectedWithoutMutation("deployFleet", G, "0", ...args);
  });

  it("rejects unavailable reserves and a fleet already dispatched this round", () => {
    const insufficient = buildDeployState();
    insufficient.playerInfo["0"].resources.skyships = 0;
    expect(MOVE_DEFINITIONS.deployFleet.validate?.(
      insufficient, "0", 0, DESTINATION, 1, 0, 0, 0
    )).toMatchObject({ code: "INSUFFICIENT_SKYSHIPS" });
    expectRejectedWithoutMutation(
      "deployFleet", insufficient, "0", 0, DESTINATION, 1, 0, 0, 0
    );

    const dispatched = buildDeployState();
    dispatched.playerInfo["0"].fleetInfo[0].dispatchedThisRound = true;
    expect(MOVE_DEFINITIONS.deployFleet.validate?.(
      dispatched, "0", 0, DESTINATION, 1, 0, 0, 0
    )).toMatchObject({ code: "ALREADY_DISPATCHED" });
    expectRejectedWithoutMutation(
      "deployFleet", dispatched, "0", 0, DESTINATION, 1, 0, 0, 0
    );
  });

  it("still deploys a legal elite fleet and charges its movement cost", () => {
    const G = buildDeployState();
    const { result } = callMoveDef(
      MOVE_DEFINITIONS.deployFleet,
      G,
      "0",
      0,
      DESTINATION,
      1,
      0,
      0,
      1
    );

    expect(result).not.toBe("INVALID_MOVE");
    expect(G.playerInfo["0"].fleetInfo[0]).toMatchObject({
      location: DESTINATION,
      skyships: 1,
      eliteRegiments: 1,
      dispatchedThisRound: true,
    });
    expect(G.playerInfo["0"].resources.gold).toBe(9);
    expect(G.playerInfo["0"].resources.eliteRegiments).toBe(1);
  });
});

function buildGarrisonState(): MyGameState {
  const G = buildInitialG([
    buildPlayer("0", {
      fleetInfo: [
        buildFleet(0, {
          location: [2, 2],
          skyships: 3,
          regiments: 2,
          levies: 1,
          eliteRegiments: 1,
        }),
      ],
    }),
    buildPlayer("1"),
  ]);
  G.step = "conquest_garrison";
  G.mapState.currentBattle = [2, 2];
  G.mapState.buildings[2][2] = {
    buildings: "outpost",
    fort: [],
    garrisonedRegiments: 0,
    garrisonedLevies: 0,
    garrisonedEliteRegiments: 0,
  };
  G.troopsAvailableForGarrison = { regiments: 2, levies: 1, elites: 1 };
  return G;
}

describe("server validation — garrisonTroops", () => {
  it.each([
    { label: "negative counts", troops: [-1, 0, 0], code: "INVALID_TROOPS" },
    { label: "fractional counts", troops: [1.5, 0, 0], code: "INVALID_TROOPS" },
    { label: "troops outside the server pool", troops: [3, 0, 0], code: "TROOPS_UNAVAILABLE" },
  ])("rejects $label without changing state", ({ troops, code }) => {
    const G = buildGarrisonState();
    expect(MOVE_DEFINITIONS.garrisonTroops.validate?.(G, "0", troops)).toMatchObject({ code });
    expectRejectedWithoutMutation("garrisonTroops", G, "0", troops);
  });

  it("rejects calls outside a garrison step", () => {
    const G = buildGarrisonState();
    G.step = "ground_resolve";
    expectRejectedWithoutMutation("garrisonTroops", G, "0", [1, 0, 0]);
  });

  it("still moves an available legal selection into the garrison", () => {
    const G = buildGarrisonState();
    const { result } = callMoveDef(
      MOVE_DEFINITIONS.garrisonTroops,
      G,
      "0",
      [1, 1, 1]
    );

    expect(result).not.toBe("INVALID_MOVE");
    expect(G.mapState.buildings[2][2]).toMatchObject({
      garrisonedRegiments: 1,
      garrisonedLevies: 1,
      garrisonedEliteRegiments: 1,
    });
    expect(G.playerInfo["0"].fleetInfo[0]).toMatchObject({
      regiments: 1,
      levies: 0,
      eliteRegiments: 0,
    });
  });
});

describe("server validation — pickLegacyCard", () => {
  const dealtCard = { name: "the builder", colour: "purple" } as const;

  it("rejects a card whose name and colour were not dealt", () => {
    const G = buildInitialG([
      buildPlayer("0", { legacyCardOptions: [dealtCard] }),
      buildPlayer("1"),
    ]);

    expectRejectedWithoutMutation(
      "pickLegacyCard",
      G,
      "0",
      { name: "the builder", colour: "orange" }
    );
  });

  it("rejects picking again when the player already holds a Legacy card", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        legacyCardOptions: [dealtCard],
        resources: buildResources({ legacyCard: dealtCard }),
      }),
      buildPlayer("1"),
    ]);

    expect(MOVE_DEFINITIONS.pickLegacyCard.validate?.(
      G, "0", dealtCard
    )).toMatchObject({ code: "ALREADY_HAS_CARD" });
    expectRejectedWithoutMutation("pickLegacyCard", G, "0", dealtCard);
  });

  it("still accepts a dealt card", () => {
    const G = buildInitialG([
      buildPlayer("0", { legacyCardOptions: [dealtCard] }),
      buildPlayer("1"),
    ]);

    const { result } = callMoveDef(MOVE_DEFINITIONS.pickLegacyCard, G, "0", dealtCard);
    expect(result).not.toBe("INVALID_MOVE");
    expect(G.playerInfo["0"].resources.legacyCard).toEqual(dealtCard);
    expect(G.playerInfo["0"].passed).toBe(true);
  });
});

describe("server validation — passFleetInfoToPlayerInfo", () => {
  function buildTransferState(): MyGameState {
    return buildInitialG([
      buildPlayer("0", {
        resources: buildResources({
          skyships: 5,
          regiments: 3,
          levies: 1,
          eliteRegiments: 1,
        }),
        fleetInfo: [
          buildFleet(0, {
            location: [...KINGDOM_LOCATION],
            skyships: 0,
            regiments: 0,
            levies: 0,
            eliteRegiments: 0,
          }),
        ],
      }),
      buildPlayer("1"),
    ]);
  }

  it("rejects a resulting fleet above the skyship cap without changing state", () => {
    const G = buildTransferState();
    expect(MOVE_DEFINITIONS.passFleetInfoToPlayerInfo.validate?.(
      G, "0", 0, MAX_SKYSHIPS_PER_FLEET + 1, 0, 0, 0
    )).toMatchObject({ code: "FLEET_SIZE_EXCEEDED" });
    expectRejectedWithoutMutation(
      "passFleetInfoToPlayerInfo",
      G,
      "0",
      0,
      MAX_SKYSHIPS_PER_FLEET + 1,
      0,
      0,
      0
    );
  });

  it("still permits a legal fleet at the cap", () => {
    const G = buildTransferState();
    const { result } = callMoveDef(
      MOVE_DEFINITIONS.passFleetInfoToPlayerInfo,
      G,
      "0",
      0,
      MAX_SKYSHIPS_PER_FLEET,
      3,
      1,
      1
    );

    expect(result).not.toBe("INVALID_MOVE");
    expect(G.playerInfo["0"].fleetInfo[0].skyships).toBe(MAX_SKYSHIPS_PER_FLEET);
    expect(G.playerInfo["0"].resources.skyships).toBe(0);
  });
});

describe("server validation — sendAgitators", () => {
  it("rejects spending below two gold without changing state", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 1 }) }),
      buildPlayer("1"),
    ]);

    expect(MOVE_DEFINITIONS.sendAgitators.validate?.(
      G, "0", "1"
    )).toMatchObject({ code: "INSUFFICIENT_GOLD" });
    expectRejectedWithoutMutation("sendAgitators", G, "0", "1");
  });

  it("respects Lenders Refuse Credit for a kingdom already in debt", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: -1 }) }),
      buildPlayer("1"),
    ]);
    G.eventState.lendersRefuseCredit = ["0"];

    expect(MOVE_DEFINITIONS.sendAgitators.validate?.(
      G, "0", "1"
    )).toMatchObject({ code: "CREDIT_REFUSED" });
    expectRejectedWithoutMutation("sendAgitators", G, "0", "1");
  });

  it("still spends two gold and places a legal agitator", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 2 }) }),
      buildPlayer("1"),
    ]);

    const { result } = callMoveDef(MOVE_DEFINITIONS.sendAgitators, G, "0", "1");
    expect(result).not.toBe("INVALID_MOVE");
    expect(G.playerInfo["0"].resources.gold).toBe(0);
    expect(G.playerInfo["1"].freeDissenters).toBe(1);
    expect(G.playerInfo["0"].agitatorsSentThisRound).toEqual(["1"]);
  });
});

function buildRetrieveState(): MyGameState {
  const G = buildInitialG([
    buildPlayer("0", {
      resources: buildResources({ skyships: 0, regiments: 0 }),
      fleetInfo: [
        buildFleet(0, {
          location: [2, 2],
          skyships: 2,
          regiments: 1,
          travelHistory: [[1, 2], [2, 2]],
        }),
      ],
    }),
    buildPlayer("1"),
  ]);
  G.mapState.battleMap[2][2] = ["0"];
  return G;
}

describe("server validation — retrieveFleets", () => {
  it("rejects a nonexistent fleet index without throwing or changing state", () => {
    const G = buildRetrieveState();
    expect(MOVE_DEFINITIONS.retrieveFleets.validate?.(
      G, "0", [99]
    )).toMatchObject({ code: "INVALID_FLEET" });
    expectRejectedWithoutMutation("retrieveFleets", G, "0", [99]);
  });

  it("rejects home fleets and route options for fleets not being retrieved", () => {
    const home = buildRetrieveState();
    home.playerInfo["0"].fleetInfo[0].location = [...KINGDOM_LOCATION];
    expectRejectedWithoutMutation("retrieveFleets", home, "0", [0]);

    const invalidOption = buildRetrieveState();
    expectRejectedWithoutMutation(
      "retrieveFleets",
      invalidOption,
      "0",
      [0],
      { placeAt: [1] }
    );
  });

  it("still retrieves a legal fleet using server-derived route placement", () => {
    const G = buildRetrieveState();
    const { result } = callMoveDef(
      MOVE_DEFINITIONS.retrieveFleets,
      G,
      "0",
      [0],
      { placeAt: [0] }
    );

    expect(result).not.toBe("INVALID_MOVE");
    expect(G.mapState.routeSkyships["2,2"]).toEqual(["0"]);
    expect(G.playerInfo["0"].fleetInfo[0].location).toEqual(KINGDOM_LOCATION);
    expect(G.playerInfo["0"].resources).toMatchObject({
      skyships: 1,
      regiments: 1,
    });
  });
});

function buildAerialState(includeSpectator = false): MyGameState {
  const card = { name: "Test Card", sword: 2, shield: 0, flipped: false };
  const players = [
    buildPlayer("0", {
      resources: buildResources({ fortuneCards: [card] }),
    }),
    buildPlayer("1"),
  ];
  if (includeSpectator) players.push(buildPlayer("2"));

  const G = buildInitialG(players);
  G.step = "aerial_resolve";
  G.battleState = {
    attacker: {
      ...structuredClone(G.playerInfo["0"]),
      decision: "fight",
    },
    defender: {
      ...structuredClone(G.playerInfo["1"]),
      decision: "fight",
    },
  };
  return G;
}

describe("server validation — aerial Fortune of War selection", () => {
  it("rejects an out-of-range hand index without changing state", () => {
    const G = buildAerialState();
    expect(MOVE_DEFINITIONS.pickCard.validate?.(
      G, "0", 5
    )).toMatchObject({ code: "OUT_OF_BOUNDS" });
    expectRejectedWithoutMutation("pickCard", G, "0", 5);
  });

  it("rejects nonparticipants for both picking and drawing", () => {
    const pickG = buildAerialState(true);
    expect(MOVE_DEFINITIONS.pickCard.validate?.(
      pickG, "2", 0
    )).toMatchObject({ code: "NOT_IN_BATTLE" });
    expectRejectedWithoutMutation("pickCard", pickG, "2", 0);

    const drawG = buildAerialState(true);
    expect(MOVE_DEFINITIONS.drawCard.validate?.(
      drawG, "2"
    )).toMatchObject({ code: "NOT_IN_BATTLE" });
    expectRejectedWithoutMutation("drawCard", drawG, "2");
  });

  it("rejects a participant whose battle card is already set", () => {
    const G = buildAerialState();
    G.battleState!.attacker.fowCard = { name: "Committed", sword: 1, shield: 0 };

    expect(MOVE_DEFINITIONS.pickCard.validate?.(
      G, "0", 0
    )).toMatchObject({ code: "CARD_ALREADY_SET" });
    expect(MOVE_DEFINITIONS.drawCard.validate?.(
      G, "0"
    )).toMatchObject({ code: "CARD_ALREADY_SET" });
    expectRejectedWithoutMutation("pickCard", G, "0", 0);
  });

  it("still lets a participant pick a card in hand", () => {
    const G = buildAerialState();
    const { result } = callMoveDef(MOVE_DEFINITIONS.pickCard, G, "0", 0);

    expect(result).not.toBe("INVALID_MOVE");
    expect(G.battleState?.attacker.fowCard).toMatchObject({
      name: "Test Card",
      sword: 2,
    });
    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(0);
  });

  it("still lets a participant draw a card", () => {
    const G = buildAerialState();
    expect(MOVE_DEFINITIONS.drawCard.validate?.(G, "0")).toBeNull();

    const result = MOVE_DEFINITIONS.drawCard.fn({
      G,
      ctx: buildCtx("0"),
      playerID: "0",
      events: buildEvents(),
      random: buildRandom(),
    });

    expect(result).not.toBe("INVALID_MOVE");
    expect(G.battleState?.attacker.fowCard).toBeDefined();
    expect(G.battleState?.attacker.fowSource).toBe("deck");
  });
});
