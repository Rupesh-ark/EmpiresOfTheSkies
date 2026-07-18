import { describe, it, expect } from "vitest";
import {
  buildInitialG,
  buildPlayer,
  buildFleet,
} from "../testHelpers.js";
import {
  buildPlayerNetwork,
  wouldPlacementConnectRoute,
  countActiveTradeRoutes,
  tileKey,
} from "../../helpers/mapUtils.js";
import { grantTradeRouteGoods } from "../../helpers/tradeRouteResolver.js";
import { MyGameState, TileLoot } from "../../types.js";

const LOOT: TileLoot = {
  gold: 2,
  mithril: 1,
  dragonScales: 0,
  krakenSkin: 0,
  magicDust: 0,
  stickyIchor: 0,
  pipeweed: 0,
  victoryPoints: 0,
};

const COLONY_LOOT: TileLoot = { ...LOOT, gold: 3, dragonScales: 1 };

/**
 * Map layout used below (8 wide, 4 tall; Faithdom at [3,0],[4,0],[3,1],[4,1]):
 * the test Land sits at [6,1]. A disc at [5,1] bridges it to Faithdom [4,1].
 */
const LAND: [number, number] = [6, 1];
const BRIDGE: [number, number] = [5, 1];

function withOutpost(G: MyGameState, playerID: string, kind: "outpost" | "colony" = "outpost") {
  const [x, y] = LAND;
  G.mapState.buildings[y][x] = {
    player: G.playerInfo[playerID],
    buildings: kind,
    fort: [],
    garrisonedRegiments: 0,
    garrisonedLevies: 0,
    garrisonedEliteRegiments: 0,
  };
  G.mapState.currentTileArray[y][x] = {
    name: "TestLand",
    blocked: [],
    sword: 0,
    shield: 0,
    loot: { outpost: { ...LOOT }, colony: { ...COLONY_LOOT } },
    type: "land",
  };
}

describe("buildPlayerNetwork", () => {
  it("includes Faithdom tiles and the player's route discs", () => {
    const G = buildInitialG();
    G.mapState.routeSkyships[tileKey(...BRIDGE)] = ["0"];

    const network = buildPlayerNetwork(G, "0");
    expect(network.has(tileKey(3, 0))).toBe(true);
    expect(network.has(tileKey(...BRIDGE))).toBe(true);
  });

  it("ignores other players' route discs", () => {
    const G = buildInitialG();
    G.mapState.routeSkyships[tileKey(...BRIDGE)] = ["1"];

    expect(buildPlayerNetwork(G, "0").has(tileKey(...BRIDGE))).toBe(false);
  });

  it("does NOT treat deployed fleets as route links", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [...BRIDGE], skyships: 3 })] }),
      buildPlayer("1"),
    ]);

    expect(buildPlayerNetwork(G, "0").has(tileKey(...BRIDGE))).toBe(false);
  });
});

describe("wouldPlacementConnectRoute", () => {
  it("is true when the placement bridges an outpost to Faithdom", () => {
    const G = buildInitialG();
    withOutpost(G, "0");

    expect(wouldPlacementConnectRoute(G, "0", tileKey(...BRIDGE))).toBe(true);
  });

  it("is false when the placement does not help", () => {
    const G = buildInitialG();
    withOutpost(G, "0");

    expect(wouldPlacementConnectRoute(G, "0", tileKey(0, 3))).toBe(false);
  });

  it("is false when the outpost is already connected by discs", () => {
    const G = buildInitialG();
    withOutpost(G, "0");
    G.mapState.routeSkyships[tileKey(...BRIDGE)] = ["0"];

    expect(wouldPlacementConnectRoute(G, "0", tileKey(5, 2))).toBe(false);
  });

  it("does not report a connection that depends on a deployed fleet", () => {
    // Land at [6,1] with a FLEET (not a disc) at the bridge tile: an irrelevant
    // placement must not read as connecting, because the fleet goes home
    // before trade resolves.
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [...BRIDGE], skyships: 3 })] }),
      buildPlayer("1"),
    ]);
    withOutpost(G, "0");

    expect(wouldPlacementConnectRoute(G, "0", tileKey(0, 3))).toBe(false);
    // ...while the genuine bridge placement still connects.
    expect(wouldPlacementConnectRoute(G, "0", tileKey(...BRIDGE))).toBe(true);
  });
});

describe("countActiveTradeRoutes", () => {
  it("counts a disc-connected outpost and ignores fleet-only chains", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [...BRIDGE], skyships: 3 })] }),
      buildPlayer("1"),
    ]);
    withOutpost(G, "0");

    expect(countActiveTradeRoutes(G, "0")).toBe(0);

    G.mapState.routeSkyships[tileKey(...BRIDGE)] = ["0"];
    expect(countActiveTradeRoutes(G, "0")).toBe(1);
  });
});

describe("grantTradeRouteGoods", () => {
  it("grants outpost loot only when connected by discs", () => {
    const G = buildInitialG();
    withOutpost(G, "0");
    const before = G.playerInfo["0"].resources.gold;

    grantTradeRouteGoods(G);
    expect(G.playerInfo["0"].resources.gold).toBe(before); // disconnected

    G.mapState.routeSkyships[tileKey(...BRIDGE)] = ["0"];
    grantTradeRouteGoods(G);
    expect(G.playerInfo["0"].resources.gold).toBe(before + LOOT.gold);
    expect(G.playerInfo["0"].resources.mithril).toBe(1);
  });

  it("grants colony loot (both rows) when connected", () => {
    const G = buildInitialG();
    withOutpost(G, "0", "colony");
    G.mapState.routeSkyships[tileKey(...BRIDGE)] = ["0"];
    const before = G.playerInfo["0"].resources.gold;

    grantTradeRouteGoods(G);
    expect(G.playerInfo["0"].resources.gold).toBe(before + COLONY_LOOT.gold);
    expect(G.playerInfo["0"].resources.dragonScales).toBe(1);
  });

  it("grants nothing when the only link is a deployed fleet", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { location: [...BRIDGE], skyships: 3 })] }),
      buildPlayer("1"),
    ]);
    withOutpost(G, "0");
    const before = G.playerInfo["0"].resources.gold;

    grantTradeRouteGoods(G);
    expect(G.playerInfo["0"].resources.gold).toBe(before);
  });
});
