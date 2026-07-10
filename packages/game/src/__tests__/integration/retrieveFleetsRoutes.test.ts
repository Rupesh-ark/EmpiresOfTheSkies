import { describe, it, expect } from "vitest";
import retrieveFleets from "../../moves/resolution/retrieveFleets";
import { getRoutePlacementTiles } from "../../helpers/mapUtils";
import { buildInitialG, buildPlayer, buildFleet, buildEvents } from "../testHelpers";
import { MyGameState, FleetInfo } from "../../types";

const runMove = (G: MyGameState, playerID: string, args: unknown[]) => {
  const events = buildEvents();
  (retrieveFleets.fn as any)({ G, playerID, events, ctx: {} as any }, ...args);
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

describe("retrieveFleets route skyship placement", () => {
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
