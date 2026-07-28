import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import retrieveFleets from "../../moves/resolution/retrieveFleets.js";
import moveFleet from "../../moves/actions/moveFleet.js";
import deployFleet from "../../moves/actions/deployFleet.js";
import {
  countActiveTradeRoutes,
  getNeighbors,
  getRoutePlacementTiles,
} from "../../helpers/mapUtils.js";
import { KINGDOM_LOCATION } from "../../data/gameData.js";
import {
  buildCtx,
  buildEvents,
  buildFleet,
  buildInitialG,
  buildPlayer,
  buildResources,
} from "../testHelpers.js";
import { MyGameState, FleetInfo } from "../../types.js";

const runMove = (G: MyGameState, playerID: string, args: unknown[]) => {
  const events = buildEvents();
  return (retrieveFleets.fn as any)(
    { G, playerID, events, ctx: {} as any },
    ...args
  );
};

const stateWithFleet = (fleet: Partial<FleetInfo>, reserveSkyships = 0) => {
  const G = buildInitialG([
    buildPlayer("0", { fleetInfo: [buildFleet(0, fleet)] }),
  ]);
  G.playerInfo["0"].resources.skyships = reserveSkyships;
  const [x, y] = G.playerInfo["0"].fleetInfo[0].location;
  G.mapState.battleMap[y][x] = ["0"];
  return G;
};

const playerDiscs = (G: MyGameState, playerID: string) =>
  Object.entries(G.mapState.routeSkyships).filter(([, players]) =>
    players.includes(playerID)
  );

const expectContiguous = (path: [number, number][]) => {
  for (let index = 1; index < path.length; index += 1) {
    expect(getNeighbors(...path[index - 1])).toContainEqual(path[index]);
  }
};

describe("retrieveFleets route skyship placement", () => {
  it("records and places a contiguous trail for a three-square fleet move that connects a claim", () => {
    const start: [number, number] = [4, 1];
    const destination: [number, number] = [7, 1];
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({ gold: 10, counsellors: 4, skyships: 0 }),
        fleetInfo: [
          buildFleet(0, {
            location: start,
            skyships: 3,
            travelHistory: [],
          }),
        ],
      }),
      buildPlayer("1"),
    ]);
    for (const row of G.mapState.discoveredTiles) row.fill(true);
    G.mapState.battleMap[start[1]][start[0]] = ["0"];
    G.mapState.buildings[1][0] = {
      player: G.playerInfo["0"],
      buildings: "outpost",
      fort: [],
      garrisonedRegiments: 0,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    };

    moveFleet.fn(
      { G, ctx: buildCtx("0"), playerID: "0", events: buildEvents() },
      0,
      destination
    );

    const travelHistory = G.playerInfo["0"].fleetInfo[0].travelHistory;
    expect(travelHistory).toHaveLength(3);
    expectContiguous([start, ...travelHistory]);

    runMove(G, "0", [[0], { trailFrom: [0] }]);

    expect(playerDiscs(G, "0")).toHaveLength(3);
    expect(countActiveTradeRoutes(G, "0")).toBe(1);
  });

  it("records a contiguous deployment trail from the Kingdom", () => {
    const destination: [number, number] = [7, 0];
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({
          gold: 10,
          counsellors: 4,
          skyships: 3,
        }),
        fleetInfo: [
          buildFleet(0, {
            location: [...KINGDOM_LOCATION],
            skyships: 0,
          }),
        ],
      }),
      buildPlayer("1"),
    ]);
    for (const x of [5, 6, 7]) G.mapState.discoveredTiles[0][x] = true;

    deployFleet.fn(
      { G, ctx: buildCtx("0"), playerID: "0", events: buildEvents() },
      0,
      destination,
      3,
      0,
      0
    );

    const travelHistory = G.playerInfo["0"].fleetInfo[0].travelHistory;
    expect(travelHistory).toHaveLength(3);
    expectContiguous([[...KINGDOM_LOCATION], ...travelHistory]);
  });

  it("deducts one skyship per placed trail disc; remainder returns home", () => {
    // [3,1] is a Faithdom tile and must be skipped
    const G = stateWithFleet(
      {
        location: [2, 3],
        skyships: 5,
        travelHistory: [
          [3, 1],
          [2, 2],
          [2, 3],
        ],
      },
      3
    );

    runMove(G, "0", [[0], { trailFrom: [0] }]);

    expect(playerDiscs(G, "0").map(([key]) => key).sort()).toEqual(["2,2", "2,3"]);
    // 2 discs placed, 3 remaining fleet ships return home: 3 + 3 = 6
    expect(G.playerInfo["0"].resources.skyships).toBe(6);
  });

  it("does not double-place or double-charge tiles revisited in the trail", () => {
    const G = stateWithFleet(
      {
        location: [2, 3],
        skyships: 5,
        travelHistory: [
          [2, 2],
          [2, 3],
          [2, 2], // backtracked
        ],
      },
      0
    );

    runMove(G, "0", [[0], { trailFrom: [0] }]);

    expect(G.mapState.routeSkyships["2,2"]).toEqual(["0"]);
    expect(playerDiscs(G, "0").length).toBe(2);
    expect(G.playerInfo["0"].resources.skyships).toBe(3);
  });

  it("places nothing and charges nothing when fleet skyships is NaN", () => {
    const G = stateWithFleet(
      {
        location: [2, 3],
        skyships: NaN as unknown as number,
        travelHistory: [
          [2, 2],
          [2, 3],
        ],
      },
      1
    );

    runMove(G, "0", [[0], { trailFrom: [0] }]);

    expect(playerDiscs(G, "0").length).toBe(0);
    // NaN fleet sanitized to 0 — reserve unchanged
    expect(G.playerInfo["0"].resources.skyships).toBe(1);
  });

  it("placeAt deducts exactly one, and zero when the tile already has the player's disc", () => {
    const G = stateWithFleet({ location: [2, 3], skyships: 2, travelHistory: [[2, 3]] }, 0);
    G.mapState.routeSkyships["2,3"] = ["0"];

    runMove(G, "0", [[0], { placeAt: [0] }]);

    expect(G.mapState.routeSkyships["2,3"]).toEqual(["0"]);
    expect(G.playerInfo["0"].resources.skyships).toBe(2); // nothing deducted
  });

  it("getRoutePlacementTiles predicts exactly what the move places (dialog parity)", () => {
    const fleetProps: Partial<FleetInfo> = {
      location: [2, 3],
      skyships: 2, // budget smaller than eligible tiles
      travelHistory: [
        [3, 1], // Faithdom — skipped
        [1, 2],
        [2, 2],
        [2, 3],
      ],
    };
    const G = stateWithFleet(fleetProps, 0);
    const predicted = getRoutePlacementTiles(
      G,
      "0",
      G.playerInfo["0"].fleetInfo[0],
      "trail"
    );

    runMove(G, "0", [[0], { trailFrom: [0] }]);

    expect(predicted.length).toBe(2);
    expect(playerDiscs(G, "0").map(([key]) => key).sort()).toEqual(
      predicted.map(([x, y]) => `${x},${y}`).sort()
    );
    expect(G.playerInfo["0"].resources.skyships).toBe(0);
  });

  it("logs the route-marker spend so players can see the subtraction", () => {
    const G = stateWithFleet(
      { location: [2, 3], skyships: 3, travelHistory: [[2, 2], [2, 3]] },
      0
    );

    runMove(G, "0", [[0], { trailFrom: [0] }]);

    const logLine = G.gameLog.find((entry) =>
      entry.message.includes("trade-route markers")
    );
    expect(logLine).toBeDefined();
    expect(logLine?.message).toContain("2 skyship(s)");
  });
});

describe("retrieveFleets route skyship reclaim", () => {
  it("reclaims one owned marker per tile with no fleets selected", () => {
    const G = buildInitialG();
    G.playerInfo["0"].resources.skyships = 4;
    G.mapState.routeSkyships["2,2"] = ["0", "0", "1"];
    G.mapState.routeSkyships["3,2"] = ["0"];

    runMove(G, "0", [[], { reclaim: [[2, 2], [3, 2]] }]);

    expect(G.mapState.routeSkyships["2,2"]).toEqual(["0", "1"]);
    expect(G.mapState.routeSkyships["3,2"]).toBeUndefined();
    expect(G.playerInfo["0"].resources.skyships).toBe(6);
    expect(G.playerInfo["0"].passed).toBe(true);
    expect(G.gameLog.at(-1)?.message).toBe("Angland reclaims 2 route skyship(s)");
  });

  it.each([
    {
      label: "an empty tile",
      routeSkyships: {},
      reclaim: [[2, 2]],
    },
    {
      label: "a rival marker",
      routeSkyships: { "2,2": ["1"] },
      reclaim: [[2, 2]],
    },
    {
      label: "the same tile twice",
      routeSkyships: { "2,2": ["0"] },
      reclaim: [[2, 2], [2, 2]],
    },
  ])("rejects reclaiming $label without changing state", ({
    routeSkyships,
    reclaim,
  }) => {
    const G = buildInitialG();
    G.mapState.routeSkyships = routeSkyships;
    const before = structuredClone(G);

    expect(runMove(G, "0", [[], { reclaim }])).toBe(INVALID_MOVE);
    expect(G).toEqual(before);
  });

  it("rejects malformed reclaim coordinates without changing state", () => {
    const G = buildInitialG();
    const before = structuredClone(G);

    expect(runMove(G, "0", [[], { reclaim: [[2, 1.5]] }])).toBe(INVALID_MOVE);
    expect(G).toEqual(before);
  });
});

describe("reclaim ordering vs placement", () => {
  it("does not re-place a marker onto a tile being reclaimed in the same move", () => {
    // Fleet sits on its own marker's tile; the player reclaims the marker AND
    // retrieves the fleet with placeAt. Placement must see the marker (and
    // skip the tile) before the reclaim removes it.
    const G = stateWithFleet({ location: [2, 2], skyships: 2 }, 0);
    G.mapState.discoveredTiles[2][2] = true;
    G.mapState.routeSkyships["2,2"] = ["0"];

    runMove(G, "0", [[0], { placeAt: [0], reclaim: [[2, 2]] }]);

    expect(G.mapState.routeSkyships["2,2"]).toBeUndefined();
    // 2 fleet skyships home + 1 reclaimed marker, none spent on placement
    expect(G.playerInfo["0"].resources.skyships).toBe(3);
  });
});
