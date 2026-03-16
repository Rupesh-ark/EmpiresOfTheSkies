/**
 * deals.test.ts
 *
 * Tests for proposeDeal, acceptDeal, rejectDeal (v4.2 Deals Between Players).
 *
 * Rules:
 *   Players may exchange Gold, Outposts/Colonies (with recipient Fleet present),
 *   Skyships in Kingdom, and Archprelate token.
 *   May NOT exchange Regiments, Levies, Skyships outside Kingdom, buildings, or VPs.
 *   Free action — no counsellor cost, no turnComplete.
 *   Only one pending deal at a time.
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import proposeDeal from "../../moves/actions/proposeDeal";
import acceptDeal from "../../moves/actions/acceptDeal";
import rejectDeal from "../../moves/actions/rejectDeal";
import { buildInitialG, buildPlayer, buildFleet, buildResources } from "../testHelpers";
import { MyGameState, MapBuildingInfo, PlayerInfo, DealOffer } from "../../types";

function callPropose(G: MyGameState, playerID: string, targetID: string, offering: DealOffer, requesting: DealOffer) {
  return (proposeDeal as Function)({ G, playerID }, targetID, offering, requesting);
}

function callAccept(G: MyGameState, playerID: string) {
  return (acceptDeal as Function)({ G, playerID });
}

function callReject(G: MyGameState, playerID: string) {
  return (rejectDeal as Function)({ G, playerID });
}

function buildMapWithBuilding(player: PlayerInfo, buildingType: "outpost" | "colony", coords: [number, number]): MapBuildingInfo[][] {
  const emptyCell: MapBuildingInfo = { fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
  const grid: MapBuildingInfo[][] = Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => ({ ...emptyCell }))
  );
  const [x, y] = coords;
  grid[y][x] = { player, buildings: buildingType, fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 };
  return grid;
}

// ── proposeDeal ──────────────────────────────────────────────────────────────

describe("proposeDeal — valid proposals", () => {
  it("creates a pending deal on G", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 5 }) }),
    ]);
    callPropose(G, "0", "1", { gold: 3 }, { gold: 1 });
    expect(G.pendingDeal).toBeDefined();
    expect(G.pendingDeal!.proposerID).toBe("0");
    expect(G.pendingDeal!.targetID).toBe("1");
    expect(G.pendingDeal!.offering.gold).toBe(3);
    expect(G.pendingDeal!.requesting.gold).toBe(1);
  });

  it("does not set turnComplete", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1"),
    ]);
    callPropose(G, "0", "1", { gold: 1 }, {});
    expect(G.playerInfo["0"].turnComplete).toBe(false);
  });

  it("allows proposing skyship trade", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ skyships: 5 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 10 }) }),
    ]);
    callPropose(G, "0", "1", { skyships: 2 }, { gold: 4 });
    expect(G.pendingDeal).toBeDefined();
  });

  it("allows proposing Archprelate token trade", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, resources: buildResources({ gold: 5 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 10 }) }),
    ]);
    callPropose(G, "0", "1", { archprelateToken: true }, { gold: 5 });
    expect(G.pendingDeal).toBeDefined();
  });
});

describe("proposeDeal — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when a deal is already pending", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1"),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { gold: 1 }, requesting: {} };
    expect(callPropose(G, "0", "1", { gold: 1 }, {})).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when proposing deal with self", () => {
    const G = buildInitialG();
    expect(callPropose(G, "0", "0", { gold: 1 }, {})).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when target doesn't exist", () => {
    const G = buildInitialG();
    expect(callPropose(G, "0", "99", { gold: 1 }, {})).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when proposer lacks gold", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 1 }) }),
      buildPlayer("1"),
    ]);
    expect(callPropose(G, "0", "1", { gold: 5 }, {})).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when proposer lacks skyships", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ skyships: 1 }) }),
      buildPlayer("1"),
    ]);
    expect(callPropose(G, "0", "1", { skyships: 5 }, {})).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when proposer is not Archprelate but offers token", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: false }),
      buildPlayer("1"),
    ]);
    expect(callPropose(G, "0", "1", { archprelateToken: true }, {})).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when target lacks gold for request", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 0 }) }),
    ]);
    expect(callPropose(G, "0", "1", {}, { gold: 5 })).toBe(INVALID_MOVE);
  });
});

// ── acceptDeal ───────────────────────────────────────────────────────────────

describe("acceptDeal — successful acceptance", () => {
  it("transfers gold both ways", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 8 }) }),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { gold: 3 }, requesting: { gold: 2 } };
    callAccept(G, "1");
    expect(G.playerInfo["0"].resources.gold).toBe(10 - 3 + 2); // 9
    expect(G.playerInfo["1"].resources.gold).toBe(8 - 2 + 3); // 9
    expect(G.pendingDeal).toBeUndefined();
  });

  it("transfers skyships", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ skyships: 5 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 10 }) }),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { skyships: 2 }, requesting: { gold: 4 } };
    callAccept(G, "1");
    expect(G.playerInfo["0"].resources.skyships).toBe(3);
    expect(G.playerInfo["1"].resources.skyships).toBe(3 + 2); // default 3 + 2
    expect(G.playerInfo["0"].resources.gold).toBe(6 + 4); // default 6 + 4
    expect(G.playerInfo["1"].resources.gold).toBe(10 - 4);
  });

  it("transfers Archprelate token", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true }),
      buildPlayer("1", { resources: buildResources({ gold: 10 }) }),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { archprelateToken: true }, requesting: { gold: 5 } };
    callAccept(G, "1");
    expect(G.playerInfo["0"].isArchprelate).toBe(false);
    expect(G.playerInfo["1"].isArchprelate).toBe(true);
  });

  it("transfers outpost ownership", () => {
    const p0 = buildPlayer("0");
    const p1 = buildPlayer("1", {
      fleetInfo: [buildFleet(0, { location: [2, 1], skyships: 2 })],
      resources: buildResources({ gold: 10 }),
    });
    const G = buildInitialG([p0, p1], {
      mapState: {
        currentTileArray: [],
        discoveredTiles: [],
        buildings: buildMapWithBuilding(p0, "outpost", [2, 1]),
        mostRecentlyDiscoveredTile: [],
        discoveredRaces: [],
        battleMap: [],
        currentBattle: [],
        goodsPriceMarkers: { mithril: 2, dragonScales: 2, krakenSkin: 2, magicDust: 2, stickyIchor: 2, pipeweed: 2 },
      },
    });
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { outposts: [[2, 1]] }, requesting: { gold: 3 } };
    callAccept(G, "1");
    expect(G.mapState.buildings[1][2].player?.id).toBe("1");
    expect(G.playerInfo["0"].resources.gold).toBe(6 + 3);
  });

  it("does not set turnComplete", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 10 }) }),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { gold: 1 }, requesting: { gold: 1 } };
    callAccept(G, "1");
    expect(G.playerInfo["0"].turnComplete).toBe(false);
    expect(G.playerInfo["1"].turnComplete).toBe(false);
  });
});

describe("acceptDeal — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when no deal pending", () => {
    const G = buildInitialG();
    expect(callAccept(G, "1")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when non-target player tries to accept", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1"),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { gold: 1 }, requesting: {} };
    expect(callAccept(G, "0")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE and clears deal when proposer can no longer fulfil", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 0 }) }), // spent their gold
      buildPlayer("1"),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { gold: 5 }, requesting: {} };
    expect(callAccept(G, "1")).toBe(INVALID_MOVE);
    expect(G.pendingDeal).toBeUndefined();
  });

  it("returns INVALID_MOVE and clears deal when target can no longer fulfil", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1", { resources: buildResources({ gold: 0 }) }),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: {}, requesting: { gold: 5 } };
    expect(callAccept(G, "1")).toBe(INVALID_MOVE);
    expect(G.pendingDeal).toBeUndefined();
  });
});

// ── rejectDeal ───────────────────────────────────────────────────────────────

describe("rejectDeal", () => {
  it("clears the pending deal", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1"),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { gold: 1 }, requesting: {} };
    callReject(G, "1");
    expect(G.pendingDeal).toBeUndefined();
  });

  it("returns INVALID_MOVE when no deal pending", () => {
    const G = buildInitialG();
    expect(callReject(G, "1")).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when non-target player tries to reject", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1"),
    ]);
    G.pendingDeal = { proposerID: "0", targetID: "1", offering: { gold: 1 }, requesting: {} };
    expect(callReject(G, "0")).toBe(INVALID_MOVE);
  });
});
