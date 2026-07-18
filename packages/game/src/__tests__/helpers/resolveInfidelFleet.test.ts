import { describe, it, expect } from "vitest";
import {
  executeInfidelFleetCombat,
  prepareInfidelFleetCombat,
} from "../../helpers/resolveInfidelFleet.js";
import {
  INFIDEL_EMPIRE_LOCATION,
  KINGDOM_LOCATION,
} from "../../data/gameData.js";
import type { FortuneOfWarCardInfo, InfidelHostCounter, MyGameState } from "../../types.js";
import {
  buildFleet,
  buildInitialG,
  buildPlayer,
  buildResources,
} from "../testHelpers.js";

const shuffle = <T>(arr: T[]): T[] => [...arr];

const fleetCounter = (): InfidelHostCounter => ({
  swords: 15,
  shields: 5,
  isFleet: true,
  isInvasionTrigger: false,
});

const setInfidelFleet = (G: MyGameState, counter = fleetCounter()) => {
  G.infidelFleet = {
    counter,
    location: [...INFIDEL_EMPIRE_LOCATION] as [number, number],
    active: true,
    destroyed: false,
  };
};

const setDeck = (G: MyGameState, cards: FortuneOfWarCardInfo[]) => {
  G.cardDecks.fortuneOfWarCards = cards;
  G.cardDecks.discardedFortuneOfWarCards = [];
};

describe("resolveInfidelFleet", () => {
  it("ignores home fleets and targets deployed fleets, including at the Infidel Empire", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ regiments: 10, levies: 0, skyships: 0 }),
        fleetInfo: [
          buildFleet(0, { location: [...KINGDOM_LOCATION], skyships: 5 }),
          buildFleet(1, { location: [...INFIDEL_EMPIRE_LOCATION], skyships: 3 }),
        ],
      }),
      buildPlayer("1", {
        resources: buildResources({ regiments: 0, levies: 0, skyships: 0 }),
        fleetInfo: [buildFleet(0, { location: [...KINGDOM_LOCATION], skyships: 0 })],
      }),
    ]);
    setInfidelFleet(G);

    const hasCombat = prepareInfidelFleetCombat(G);

    expect(hasCombat).toBe(true);
    expect(G.infidelFleet?.location).toEqual(INFIDEL_EMPIRE_LOCATION);
    expect(G.infidelFleetCombat).toEqual({ targetPlayerID: "0", fleetIndex: 1 });
  });

  it("rotates tied targets from the first tied player in round 1", () => {
    const players = [
      buildPlayer("0", {
        resources: buildResources({ regiments: 0, levies: 0, skyships: 0 }),
        fleetInfo: [buildFleet(0, { location: [1, 1], skyships: 1 })],
      }),
      buildPlayer("1", {
        resources: buildResources({ regiments: 0, levies: 0, skyships: 0 }),
        fleetInfo: [buildFleet(0, { location: [2, 1], skyships: 1 })],
      }),
    ];

    const roundOne = buildInitialG(players, { round: 1 });
    setInfidelFleet(roundOne);
    prepareInfidelFleetCombat(roundOne);
    expect(roundOne.infidelFleetCombat?.targetPlayerID).toBe("0");

    const roundTwo = buildInitialG(players, { round: 2 });
    setInfidelFleet(roundTwo);
    prepareInfidelFleetCombat(roundTwo);
    expect(roundTwo.infidelFleetCombat?.targetPlayerID).toBe("1");
  });

  it("counts elite regiments as three military power in kingdom, fleets, and garrisons", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ regiments: 0, eliteRegiments: 1, levies: 0, skyships: 0 }),
        fleetInfo: [buildFleet(0, { location: [1, 1], skyships: 1, eliteRegiments: 1 })],
      }),
      buildPlayer("1", {
        resources: buildResources({ regiments: 0, eliteRegiments: 0, levies: 8, skyships: 0 }),
        fleetInfo: [buildFleet(0, { location: [...KINGDOM_LOCATION], skyships: 0 })],
      }),
    ]);
    G.mapState.buildings[0][0] = {
      player: {
        id: "0",
        colour: G.playerInfo["0"].colour,
        kingdomName: G.playerInfo["0"].kingdomName,
      },
      fort: [],
      garrisonedRegiments: 0,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 1,
    };
    setInfidelFleet(G);

    prepareInfidelFleetCombat(G);

    expect(G.infidelFleetCombat?.targetPlayerID).toBe("0");
  });

  it("returns a destroyed Infidel Fleet counter to the pool and clears it from the map", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [buildFleet(0, { location: [1, 1], skyships: 25 })],
      }),
      buildPlayer("1"),
    ]);
    setInfidelFleet(G);
    G.infidelFleetCombat = { targetPlayerID: "0", fleetIndex: 0 };
    setDeck(G, [{ name: "Sword1_1", sword: 1, shield: 0 }]);

    executeInfidelFleetCombat(G, shuffle, { sword: 0, shield: 0 });

    expect(G.infidelFleet).toBeNull();
    expect(G.infidelHostPool).toHaveLength(1);
    expect(G.infidelHostPool[0].isFleet).toBe(true);
    expect(G.battleResult?.outcome).toBe("Angland destroys the Infidel Fleet!");
  });

  it("reports defender swords and losses from the pre-loss fleet", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [buildFleet(0, { location: [1, 1], skyships: 3, regiments: 1 })],
      }),
      buildPlayer("1"),
    ]);
    setInfidelFleet(G);
    G.infidelFleetCombat = { targetPlayerID: "0", fleetIndex: 0 };
    setDeck(G, [{ name: "Sword1_1", sword: 1, shield: 0 }]);

    executeInfidelFleetCombat(G, shuffle, { sword: 0, shield: 0 });

    expect(G.playerInfo["0"].fleetInfo[0].skyships).toBe(0);
    expect(G.battleResult?.defenderSwords).toBe(5);
    expect(G.battleResult?.defenderShields).toBe(3);
    expect(G.battleResult?.defenderLosses).toBe("3 skyship(s)");
  });
});
