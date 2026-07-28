import { describe, expect, it } from "vitest";
import { KINGDOM_LOCATION } from "../../data/gameData.js";
import { MOVE_DEFINITIONS } from "../../moveDefinitions.js";
import type { MyGameState } from "../../types.js";
import {
  buildFleet,
  buildInitialG,
  buildPlayer,
  callMoveDef,
} from "../testHelpers.js";

const TILE: [number, number] = [2, 2];

function buildTransferG(): MyGameState {
  const G = buildInitialG([
    buildPlayer("0", {
      fleetInfo: [
        buildFleet(0, {
          location: [...TILE],
          skyships: 2,
          regiments: 1,
          levies: 1,
          travelHistory: [[1, 2], [...TILE]],
        }),
        buildFleet(1, {
          location: [...TILE],
          skyships: 1,
        }),
      ],
    }),
    buildPlayer("1"),
  ]);
  G.mapState.battleMap[TILE[1]][TILE[0]] = ["0"];
  return G;
}

describe("fleet transfers", () => {
  it("returns a completely emptied source fleet home without scrubbing a co-located fleet", () => {
    const G = buildTransferG();

    const { result } = callMoveDef(
      MOVE_DEFINITIONS.transferBetweenFleets,
      G,
      "0",
      0,
      1,
      2,
      1,
      1,
      0
    );

    expect(result).not.toBe("INVALID_MOVE");
    expect(G.playerInfo["0"].fleetInfo[0].location).toEqual(KINGDOM_LOCATION);
    expect(G.playerInfo["0"].fleetInfo[0].travelHistory).toEqual([]);
    expect(G.mapState.battleMap[TILE[1]][TILE[0]]).toContain("0");
  });

  it("does not create duplicate battleMap entries when the other fleet remains", () => {
    const G = buildTransferG();

    callMoveDef(
      MOVE_DEFINITIONS.transferBetweenFleets,
      G,
      "0",
      0,
      1,
      2,
      1,
      1,
      0
    );

    expect(
      G.mapState.battleMap[TILE[1]][TILE[0]].filter(
        (playerID) => playerID === "0"
      )
    ).toHaveLength(1);
  });

  it("rejects stripping all skyships while two troops remain aboard", () => {
    const G = buildTransferG();
    const sourceFleet = G.playerInfo["0"].fleetInfo[0];
    sourceFleet.regiments = 2;
    sourceFleet.levies = 0;

    const validationError =
      MOVE_DEFINITIONS.transferBetweenFleets.validate?.(
        G,
        "0",
        0,
        1,
        2,
        0,
        0,
        0
      );
    const { result } = callMoveDef(
      MOVE_DEFINITIONS.transferBetweenFleets,
      G,
      "0",
      0,
      1,
      2,
      0,
      0,
      0
    );

    expect(validationError?.code).toBe("SOURCE_TROOP_CAPACITY");
    expect(result).toBe("INVALID_MOVE");
    expect(sourceFleet.skyships).toBe(2);
  });

  it("accepts a transfer leaving the source with no troops or skyships", () => {
    const G = buildTransferG();
    const sourceFleet = G.playerInfo["0"].fleetInfo[0];
    sourceFleet.regiments = 2;
    sourceFleet.levies = 0;

    const { result } = callMoveDef(
      MOVE_DEFINITIONS.transferBetweenFleets,
      G,
      "0",
      0,
      1,
      2,
      2,
      0,
      0
    );

    expect(result).not.toBe("INVALID_MOVE");
    expect(sourceFleet.skyships).toBe(0);
    expect(sourceFleet.regiments).toBe(0);
    expect(sourceFleet.location).toEqual(KINGDOM_LOCATION);
  });

  it("does not remove another player when a retrieved fleet is absent from battleMap", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [
          buildFleet(0, {
            location: [...TILE],
            skyships: 1,
          }),
        ],
      }),
      buildPlayer("1"),
    ]);
    G.mapState.battleMap[TILE[1]][TILE[0]] = ["1"];

    callMoveDef(MOVE_DEFINITIONS.retrieveFleets, G, "0", [0]);

    expect(G.mapState.battleMap[TILE[1]][TILE[0]]).toEqual(["1"]);
  });
});
