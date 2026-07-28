import { INVALID_MOVE } from "boardgame.io/core";
import { describe, expect, it, vi } from "vitest";
import { bfsShortestPath, computeRetreatDestinations, getNeighbors } from "../../helpers/mapUtils.js";
import { resolveBattleAndReturnWinner } from "../../helpers/resolveBattle.js";
import evadeAttackingFleet from "../../moves/aerialBattle/evadeAttackingFleet.js";
import relocateDefeatedFleet from "../../moves/aerialBattle/relocateDefeatedFleet.js";
import type { EventsAPI, MyGameState } from "../../types.js";
import {
  buildCtx,
  buildFleet,
  buildInitialG,
  buildPlayer,
  buildRandom,
} from "../testHelpers.js";

const BATTLE: [number, number] = [0, 1];

const stubEvents = () =>
  ({
    endTurn: vi.fn(),
    endPhase: vi.fn(),
  } as unknown as EventsAPI);

const discoverAllTiles = (G: MyGameState): void => {
  G.mapState.discoveredTiles.forEach((row) => row.fill(true));
};

const setBattleState = (G: MyGameState): void => {
  G.battleState = {
    attacker: {
      ...G.playerInfo["0"],
      decision: "fight",
    },
    defender: {
      ...G.playerInfo["1"],
      decision: "fight",
    },
  };
};

const buildRetreatG = (
  loserFleets = [buildFleet(0, { location: BATTLE, skyships: 2 })]
): MyGameState => {
  const winner = buildPlayer("0", {
    fleetInfo: [buildFleet(0, { location: BATTLE, skyships: 3 })],
  });
  const loser = buildPlayer("1", { fleetInfo: loserFleets });
  const G = buildInitialG([winner, loser], { step: "relocate_loser" });
  G.mapState.currentBattle = [...BATTLE];
  G.mapState.battleMap[BATTLE[1]][BATTLE[0]] = ["0", "1"];
  setBattleState(G);
  return G;
};

const relocate = (
  G: MyGameState,
  destination: [number, number]
): unknown =>
  relocateDefeatedFleet.fn(
    {
      G,
      ctx: buildCtx("0"),
      playerID: "0",
      events: stubEvents(),
    },
    destination,
    "1"
  );

const otherPlayerEntries = (
  G: MyGameState,
  retreatingPlayerID: string
): string[] =>
  G.mapState.battleMap.flatMap((row, y) =>
    row.flatMap((players, x) =>
      players
        .filter((playerID) => playerID !== retreatingPlayerID)
        .map((playerID) => `${x},${y}:${playerID}`)
    )
  );

describe("retreat and evasion relocation", () => {
  it("offers every nearest-empty ring-2 tile when the loser is surrounded and accepts one", () => {
    const attacker = buildPlayer("0", {
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
    const G = buildInitialG([attacker, defender], {
      step: "aerial_resolve",
    });
    G.mapState.currentBattle = [...BATTLE];
    G.mapState.battleMap[BATTLE[1]][BATTLE[0]] = ["0", "1"];
    discoverAllTiles(G);
    getNeighbors(...BATTLE).forEach(([x, y]) => {
      G.mapState.battleMap[y][x] = ["2"];
    });
    setBattleState(G);

    resolveBattleAndReturnWinner(G, stubEvents(), buildCtx("0"));

    const expectedRingTwo: [number, number][] = [
      [6, 0],
      [6, 1],
      [6, 2],
      [7, 3],
      [0, 3],
      [1, 3],
      [2, 0],
      [2, 1],
      [2, 2],
    ];
    expect(G.step).toBe("relocate_loser");
    expect(G.validRelocationTiles).toContainEqual(BATTLE);
    expectedRingTwo.forEach((tile) => {
      expect(G.validRelocationTiles).toContainEqual(tile);
    });

    const result = relocate(G, [2, 1]);

    expect(result).not.toBe(INVALID_MOVE);
    expect(G.playerInfo["1"].fleetInfo[0].location).toEqual([2, 1]);
  });

  it("offers and accepts an adjacent tile occupied only by the retreater", () => {
    const destination: [number, number] = [1, 1];
    const G = buildRetreatG([
      buildFleet(0, { location: BATTLE, skyships: 2 }),
      buildFleet(1, { location: destination, skyships: 1 }),
    ]);
    G.step = "aerial_attack_or_evade";
    G.mapState.battleMap[destination[1]][destination[0]] = ["1"];
    discoverAllTiles(G);

    evadeAttackingFleet.fn({
      G,
      ctx: buildCtx("1"),
      playerID: "1",
      events: stubEvents(),
      random: buildRandom(),
    });

    expect(G.validRelocationTiles).toContainEqual(destination);
    const result = relocate(G, destination);

    expect(result).not.toBe(INVALID_MOVE);
    expect(G.playerInfo["1"].fleetInfo[0].location).toEqual(destination);
    expect(G.mapState.battleMap[destination[1]][destination[0]]).toEqual(["1"]);
  });

  it("treats elite-only troops as laden for mountain-blocked adjacency", () => {
    const acrossMountain: [number, number] = [1, 1];
    const G = buildRetreatG([
      buildFleet(0, {
        location: BATTLE,
        skyships: 1,
        regiments: 0,
        levies: 0,
        eliteRegiments: 1,
      }),
    ]);
    G.mapState.currentTileArray[BATTLE[1]][BATTLE[0]].blocked = ["E"];
    G.mapState.discoveredTiles[acrossMountain[1]][acrossMountain[0]] = true;

    const ladenDestinations = computeRetreatDestinations(G, BATTLE, "1");

    expect(ladenDestinations).not.toContainEqual(acrossMountain);

    G.playerInfo["1"].fleetInfo[0].eliteRegiments = 0;
    const unladenDestinations = computeRetreatDestinations(G, BATTLE, "1");

    expect(unladenDestinations).toContainEqual(acrossMountain);
  });

  it("moves multiple fleets while changing each battleMap player entry only once", () => {
    const destination: [number, number] = [1, 1];
    const G = buildRetreatG([
      buildFleet(0, { location: BATTLE, skyships: 1 }),
      buildFleet(1, { location: BATTLE, skyships: 1 }),
    ]);
    G.mapState.discoveredTiles[destination[1]][destination[0]] = true;
    G.mapState.battleMap[0][2] = ["2", "3"];
    G.mapState.battleMap[3][5] = ["0"];
    G.validRelocationTiles = computeRetreatDestinations(G, BATTLE, "1");
    const otherEntriesBefore = otherPlayerEntries(G, "1");

    const result = relocate(G, destination);

    expect(result).not.toBe(INVALID_MOVE);
    expect(
      G.playerInfo["1"].fleetInfo.every(
        (fleet) =>
          fleet.location[0] === destination[0] &&
          fleet.location[1] === destination[1]
      )
    ).toBe(true);
    expect(G.mapState.battleMap[BATTLE[1]][BATTLE[0]]).not.toContain("1");
    expect(
      G.mapState.battleMap[destination[1]][destination[0]].filter(
        (playerID) => playerID === "1"
      )
    ).toHaveLength(1);
    expect(otherPlayerEntries(G, "1")).toEqual(otherEntriesBefore);
  });

  it("allows the loser to stay put without changing the contested battleMap tile", () => {
    const G = buildRetreatG();
    G.validRelocationTiles = computeRetreatDestinations(G, BATTLE, "1");
    const battleMapBefore = [...G.mapState.battleMap[BATTLE[1]][BATTLE[0]]];

    const result = relocate(G, BATTLE);

    expect(result).not.toBe(INVALID_MOVE);
    expect(G.playerInfo["1"].fleetInfo[0].location).toEqual(BATTLE);
    expect(G.mapState.battleMap[BATTLE[1]][BATTLE[0]]).toEqual(
      battleMapBefore
    );
    expect(G.mapState.battleMap[BATTLE[1]][BATTLE[0]]).toEqual(["0", "1"]);
  });

  it("treats every Faithdom tile as the retreat-home choice", () => {
    const G = buildRetreatG();
    G.validRelocationTiles = [];
    const skyshipsBefore = G.playerInfo["1"].resources.skyships;

    const result = relocate(G, [3, 0]);

    expect(result).not.toBe(INVALID_MOVE);
    expect(G.playerInfo["1"].fleetInfo[0].location).toEqual([4, 0]);
    expect(G.playerInfo["1"].fleetInfo[0].skyships).toBe(0);
    expect(G.playerInfo["1"].resources.skyships).toBe(skyshipsBefore + 2);
    expect(G.mapState.battleMap[BATTLE[1]][BATTLE[0]]).toEqual(["0"]);
  });
});

describe("stay-put inside the Faithdom region", () => {
  it("keeps the defeated fleet in place instead of force-retrieving it home", () => {
    const G = buildRetreatG([buildFleet(0, { location: [3, 1], skyships: 2 })]);
    G.mapState.currentBattle = [3, 1];
    G.mapState.battleMap[1][3] = ["0", "1"];
    G.mapState.battleMap[BATTLE[1]][BATTLE[0]] = [];
    G.playerInfo["0"].fleetInfo[0].location = [3, 1];
    G.validRelocationTiles = [[3, 1]];

    relocate(G, [3, 1]);

    expect(G.playerInfo["1"].fleetInfo[0].location).toEqual([3, 1]);
    expect(G.playerInfo["1"].fleetInfo[0].skyships).toBe(2);
    expect(G.mapState.battleMap[1][3]).toEqual(["0", "1"]);
  });
});

describe("bfsShortestPath discovery constraint", () => {
  it("routes around undiscovered tiles when given the discovered grid", () => {
    const G = buildRetreatG();
    const discovered = G.mapState.discoveredTiles.map((row) => row.map(() => true));
    discovered[0][1] = false;
    discovered[1][1] = false;

    const unconstrained = bfsShortestPath([0, 0], [[2, 0]], G.mapState.currentTileArray);
    const constrained = bfsShortestPath(
      [0, 0],
      [[2, 0]],
      G.mapState.currentTileArray,
      discovered
    );

    expect(unconstrained.some(([x, y]) => (x === 1 && y === 0) || (x === 1 && y === 1))).toBe(true);
    expect(constrained.length).toBeGreaterThan(0);
    expect(constrained.some(([x, y]) => (x === 1 && y === 0) || (x === 1 && y === 1))).toBe(false);
  });
});
