/**
 * invasion.test.ts
 *
 * Tests for the invasion and Infidel Fleet interactive systems:
 * - nominateCaptainGeneral: Archprelate picks the Captain-General
 * - contributeToGrandArmy: each player offers troops
 * - offerBuyoffGold: each player offers gold after army defeat
 * - respondToInfidelFleet: targeted player fights or evades
 */

import { describe, it, expect, vi } from "vitest";
import nominateCaptainGeneral from "../../moves/events/nominateCaptainGeneral";
import contributeToGrandArmy from "../../moves/events/contributeToGrandArmy";
import offerBuyoffGold from "../../moves/events/offerBuyoffGold";
import respondToInfidelFleet from "../../moves/events/respondToInfidelFleet";
import commitDeferredBattleCard from "../../moves/events/commitDeferredBattleCard";
import { setupNextDeferredBattle } from "../../helpers/resolutionFlow";
import { buildInitialG, buildPlayer, buildCtx, buildResources, buildFleet, buildRandom } from "../testHelpers";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState, DeferredEvent, MapBuildingInfo, TileInfoProps } from "../../types";

const stubEvents = () => ({ endTurn: vi.fn(), endPhase: vi.fn() });

function callNominate(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  nomineeID: string,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const result = (nominateCaptainGeneral as Function)(
    { G, ctx, playerID, events },
    nomineeID
  );
  return { result, events };
}

function callContribute(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  regiments: number,
  levies: number,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const result = (contributeToGrandArmy as Function)(
    { G, ctx, playerID, events },
    regiments,
    levies
  );
  return { result, events };
}

function callBuyoff(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  amount: number,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const result = (offerBuyoffGold as Function)(
    { G, ctx, playerID, events },
    amount
  );
  return { result, events };
}

function callRespondFleet(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  response: "fight" | "evade",
  fowCardIndex?: number,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const random = buildRandom();
  const result = (respondToInfidelFleet as Function)(
    { G, ctx, playerID, events, random },
    response,
    fowCardIndex
  );
  return { result, events };
}

// ── nominateCaptainGeneral ──────────────────────────────────────────────────

describe("nominateCaptainGeneral — validation", () => {
  it("returns INVALID_MOVE if no currentInvasion", () => {
    const G = buildInitialG();
    G.currentInvasion = null;
    const { result } = callNominate(G, "0", "1");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if invasion phase is not 'nominate'", () => {
    const G = buildInitialG();
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "contribute",
    };
    const { result } = callNominate(G, "0", "1");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if caller is not Archprelate", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: false }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "nominate",
    };
    const { result } = callNominate(G, "0", "1");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if nominee does not exist", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "nominate",
    };
    const { result } = callNominate(G, "0", "99");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if Orthodox players exist but nominee is Heretic", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { hereticOrOrthodox: "heretic" }),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "nominate",
    };
    const { result } = callNominate(G, "0", "1", ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("nominateCaptainGeneral — state mutations", () => {
  it("sets nominee as Captain-General and clears previous", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, isCaptainGeneral: true }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "nominate",
    };
    callNominate(G, "0", "1", ["0", "1"]);
    expect(G.playerInfo["0"].isCaptainGeneral).toBe(false);
    expect(G.playerInfo["1"].isCaptainGeneral).toBe(true);
  });

  it("sets invasion phase to 'contribute'", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "nominate",
    };
    callNominate(G, "0", "1", ["0", "1"]);
    expect(G.currentInvasion!.phase).toBe("contribute");
    expect(G.stage).toBe("invasion_contribute");
  });

  it("allows nominating Heretic when all players are Heretic", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "heretic" }),
      buildPlayer("1", { hereticOrOrthodox: "heretic" }),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "nominate",
    };
    const { result } = callNominate(G, "0", "1", ["0", "1"]);
    expect(result).not.toBe(INVALID_MOVE);
    expect(G.playerInfo["1"].isCaptainGeneral).toBe(true);
  });

  it("calls endTurn to first player in playOrder", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "nominate",
    };
    const { events } = callNominate(G, "0", "1", ["0", "1"]);
    expect(events.endTurn).toHaveBeenCalledWith({ next: "0" });
  });
});

// ── contributeToGrandArmy ───────────────────────────────────────────────────

describe("contributeToGrandArmy — validation", () => {
  it("returns INVALID_MOVE if no currentInvasion", () => {
    const G = buildInitialG();
    G.currentInvasion = null;
    const { result } = callContribute(G, "0", 2, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if invasion phase is not 'contribute'", () => {
    const G = buildInitialG();
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "nominate",
    };
    const { result } = callContribute(G, "0", 2, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if regiments exceed available", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 3 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "contribute",
    };
    const { result } = callContribute(G, "0", 5, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if negative troops", () => {
    const G = buildInitialG();
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "contribute",
    };
    const { result } = callContribute(G, "0", -1, 0);
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("contributeToGrandArmy — state mutations", () => {
  it("records contribution correctly", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6, levies: 3 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "contribute",
    };
    callContribute(G, "0", 4, 2, ["0", "1"]);
    expect(G.currentInvasion!.contributions["0"]).toEqual({
      regiments: 4,
      levies: 2,
      skyships: 0,
    });
  });

  it("contributing 0 troops is valid", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "contribute",
    };
    const { result } = callContribute(G, "0", 0, 0, ["0", "1"]);
    expect(result).not.toBe(INVALID_MOVE);
    expect(G.currentInvasion!.contributions["0"]).toEqual({
      regiments: 0,
      levies: 0,
      skyships: 0,
    });
  });

  it("advances to next player when not all have contributed", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "contribute",
    };
    const { events } = callContribute(G, "0", 3, 0, ["0", "1"]);
    expect(events.endTurn).toHaveBeenCalledWith({ next: "1" });
  });
});

// ── offerBuyoffGold ─────────────────────────────────────────────────────────

describe("offerBuyoffGold — validation", () => {
  it("returns INVALID_MOVE if no currentInvasion", () => {
    const G = buildInitialG();
    G.currentInvasion = null;
    const { result } = callBuyoff(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if invasion phase is not 'buyoff'", () => {
    const G = buildInitialG();
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "contribute",
    };
    const { result } = callBuyoff(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if no buyoffOffered object", () => {
    const G = buildInitialG();
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "buyoff",
      // buyoffOffered not set
    };
    const { result } = callBuyoff(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if amount is negative", () => {
    const G = buildInitialG();
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "buyoff",
      buyoffCost: 8,
      buyoffOffered: {},
    };
    const { result } = callBuyoff(G, "0", -1);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if amount exceeds player's gold", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 3 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "buyoff",
      buyoffCost: 8,
      buyoffOffered: {},
    };
    const { result } = callBuyoff(G, "0", 5);
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("offerBuyoffGold — state mutations", () => {
  it("records the gold offer", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "buyoff",
      buyoffCost: 8,
      buyoffOffered: {},
    };
    callBuyoff(G, "0", 5, ["0", "1"]);
    expect(G.currentInvasion!.buyoffOffered!["0"]).toBe(5);
  });

  it("offering 0 gold is valid", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "buyoff",
      buyoffCost: 8,
      buyoffOffered: {},
    };
    const { result } = callBuyoff(G, "0", 0, ["0", "1"]);
    expect(result).not.toBe(INVALID_MOVE);
  });

  it("advances to next player when not all have offered", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "buyoff",
      buyoffCost: 8,
      buyoffOffered: {},
    };
    const { events } = callBuyoff(G, "0", 5, ["0", "1"]);
    expect(events.endTurn).toHaveBeenCalledWith({ next: "1" });
  });

  it("applies buyoff when all players have offered", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 10 }) }),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: { "0": { regiments: 0, levies: 0, skyships: 0 }, "1": { regiments: 0, levies: 0, skyships: 0 } },
      phase: "buyoff",
      buyoffCost: 8,
      buyoffOffered: {},
    };
    callBuyoff(G, "0", 4, ["0", "1"]);
    callBuyoff(G, "1", 4, ["0", "1"]);

    // After both offer: gold deducted, invasion cleared
    expect(G.playerInfo["0"].resources.gold).toBe(6); // 10 - 4
    expect(G.playerInfo["1"].resources.gold).toBe(6);
    expect(G.currentInvasion).toBeNull();
    expect(G.stage).toBe("retrieve fleets");
  });
});

// ── respondToInfidelFleet ───────────────────────────────────────────────────

describe("respondToInfidelFleet — validation", () => {
  it("returns INVALID_MOVE if no infidelFleetCombat", () => {
    const G = buildInitialG();
    G.infidelFleetCombat = null;
    const { result } = callRespondFleet(G, "0", "evade");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if wrong player", () => {
    const G = buildInitialG();
    G.infidelFleetCombat = { targetPlayerID: "0", fleetIndex: 0 };
    const { result } = callRespondFleet(G, "1", "evade");
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("respondToInfidelFleet — evade", () => {
  it("clears infidelFleetCombat without combat", () => {
    const G = buildInitialG([
      buildPlayer("0", { fleetInfo: [buildFleet(0, { skyships: 5 })] }),
      buildPlayer("1"),
    ]);
    G.infidelFleetCombat = { targetPlayerID: "0", fleetIndex: 0 };
    G.infidelFleet = { counter: { swords: 15, shields: 5 }, location: [0, 0], active: true, destroyed: false } as any;
    callRespondFleet(G, "0", "evade");
    expect(G.infidelFleetCombat).toBeNull();
  });
});

describe("respondToInfidelFleet — fight", () => {
  it("removes FoW card from hand when index is provided", () => {
    const fowCard = { name: "Battle card", sword: 4, shield: 3, flipped: false };
    const G = buildInitialG([
      buildPlayer("0", {
        fleetInfo: [buildFleet(0, { skyships: 5 })],
        resources: buildResources({ fortuneCards: [fowCard] }),
      }),
      buildPlayer("1"),
    ]);
    G.infidelFleetCombat = { targetPlayerID: "0", fleetIndex: 0 };
    G.infidelFleet = { counter: { swords: 15, shields: 5 }, location: [0, 0], active: true, destroyed: false } as any;
    // Ensure FoW deck has cards for auto-draw
    G.cardDecks.fortuneOfWarCards = [
      { name: "test1", sword: 1, shield: 1 },
      { name: "test2", sword: 1, shield: 1 },
    ];

    callRespondFleet(G, "0", "fight", 0);
    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(0);
  });
});

// ── Helper: build map with a valid tile and building at (x, y) ──────────────

function setupMapTile(
  G: MyGameState,
  x: number,
  y: number,
  tileOverrides: Partial<TileInfoProps> = {},
  buildingOverrides: Partial<MapBuildingInfo> = {}
) {
  // Ensure the 2D arrays are large enough
  while (G.mapState.currentTileArray.length <= y) G.mapState.currentTileArray.push([]);
  while (G.mapState.currentTileArray[y].length <= x)
    G.mapState.currentTileArray[y].push({
      name: "Empty",
      blocked: [],
      sword: 0,
      shield: 0,
      loot: { outpost: { gold: 0 }, colony: { gold: 0 } } as any,
      type: "land",
    });
  while (G.mapState.buildings.length <= y) G.mapState.buildings.push([]);
  while (G.mapState.buildings[y].length <= x)
    G.mapState.buildings[y].push({
      fort: false,
      garrisonedRegiments: 0,
      garrisonedLevies: 0,
      garrisonedEliteRegiments: 0,
    });

  G.mapState.currentTileArray[y][x] = {
    name: "Test Land",
    blocked: [],
    sword: 3,
    shield: 1,
    loot: { outpost: { gold: 1 }, colony: { gold: 2 } } as any,
    type: "land",
    ...tileOverrides,
  };
  G.mapState.buildings[y][x] = {
    player: G.playerInfo["0"],
    buildings: "colony",
    fort: false,
    garrisonedRegiments: 2,
    garrisonedLevies: 1,
    garrisonedEliteRegiments: 0,
    ...buildingOverrides,
  };
}

function callCommitDeferredBattle(
  G: MyGameState,
  playerID: string,
  fowCardIndex?: number,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const random = buildRandom();
  const result = (commitDeferredBattleCard as Function)(
    { G, ctx, playerID, events, random },
    fowCardIndex
  );
  return { result, events };
}

// ── commitDeferredBattleCard ────────────────────────────────────────────────

describe("commitDeferredBattleCard — validation", () => {
  it("returns INVALID_MOVE if no currentDeferredBattle", () => {
    const G = buildInitialG();
    G.currentDeferredBattle = null;
    const { result } = callCommitDeferredBattle(G, "0");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if wrong player (not the target)", () => {
    const G = buildInitialG();
    setupMapTile(G, 0, 0);
    const event: DeferredEvent = { card: "faerie_uprising", targetPlayerID: "0", targetTile: [0, 0] };
    G.currentDeferredBattle = { event, description: "test" };
    // Player "1" is NOT the target
    const { result } = callCommitDeferredBattle(G, "1");
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("commitDeferredBattleCard — FoW card handling", () => {
  it("removes FoW card from hand when index provided", () => {
    const fowCard = { name: "Battle card", sword: 4, shield: 3, flipped: false };
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ fortuneCards: [fowCard] }) }),
      buildPlayer("1"),
    ]);
    setupMapTile(G, 0, 0);
    // Ensure deck has cards for the attacker's auto-draw
    G.cardDecks.fortuneOfWarCards = [
      { name: "deck1", sword: 1, shield: 1 },
      { name: "deck2", sword: 1, shield: 1 },
    ];
    const event: DeferredEvent = { card: "faerie_uprising", targetPlayerID: "0", targetTile: [0, 0] };
    G.currentDeferredBattle = { event, description: "test" };

    callCommitDeferredBattle(G, "0", 0);
    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(0);
  });

  it("works without FoW card (draws from deck instead)", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ fortuneCards: [] }) }),
      buildPlayer("1"),
    ]);
    setupMapTile(G, 0, 0);
    G.cardDecks.fortuneOfWarCards = [
      { name: "deck1", sword: 1, shield: 1 },
      { name: "deck2", sword: 2, shield: 2 },
      { name: "deck3", sword: 3, shield: 3 },
    ];
    const event: DeferredEvent = { card: "faerie_uprising", targetPlayerID: "0", targetTile: [0, 0] };
    G.currentDeferredBattle = { event, description: "test" };

    // No fowCardIndex — should draw from deck for both attacker and defender
    const deckSizeBefore = G.cardDecks.fortuneOfWarCards.length;
    const { result } = callCommitDeferredBattle(G, "0");
    expect(result).not.toBe(INVALID_MOVE);
    // Two cards drawn from deck (one for land attacker, one for defender auto-draw)
    expect(G.cardDecks.fortuneOfWarCards.length).toBeLessThan(deckSizeBefore);
  });
});

describe("commitDeferredBattleCard — resolution", () => {
  it("clears currentDeferredBattle after resolution", () => {
    const G = buildInitialG();
    setupMapTile(G, 0, 0);
    G.cardDecks.fortuneOfWarCards = [
      { name: "deck1", sword: 1, shield: 1 },
      { name: "deck2", sword: 2, shield: 2 },
      { name: "deck3", sword: 3, shield: 3 },
    ];
    const event: DeferredEvent = { card: "faerie_uprising", targetPlayerID: "0", targetTile: [0, 0] };
    G.currentDeferredBattle = { event, description: "test" };

    callCommitDeferredBattle(G, "0");
    expect(G.currentDeferredBattle).toBeNull();
  });
});

// ── setupNextDeferredBattle ─────────────────────────────────────────────────

describe("setupNextDeferredBattle", () => {
  it("sets up first non-rebellion deferred event as currentDeferredBattle", () => {
    const G = buildInitialG();
    setupMapTile(G, 2, 3);
    const event: DeferredEvent = { card: "faerie_uprising", targetPlayerID: "0", targetTile: [2, 3] };
    G.eventState.deferredEvents = [event];
    const events = stubEvents();

    setupNextDeferredBattle(G, events as any);

    expect(G.currentDeferredBattle).not.toBeNull();
    expect(G.currentDeferredBattle!.event.card).toBe("faerie_uprising");
    expect(G.currentDeferredBattle!.event.targetPlayerID).toBe("0");
    expect(G.stage).toBe("deferred_battle");
    // The event should be removed from the deferred list
    expect(G.eventState.deferredEvents).toHaveLength(0);
    // Should end turn to the target player
    expect(events.endTurn).toHaveBeenCalledWith({ next: "0" });
  });

  it("skips rebellion events (cards ending with _rebellion)", () => {
    const G = buildInitialG();
    setupMapTile(G, 1, 1);
    const rebellionEvent: DeferredEvent = { card: "colonial_rebellion" as any, targetPlayerID: "0", targetTile: [1, 1] };
    const battleEvent: DeferredEvent = { card: "faerie_uprising", targetPlayerID: "1", targetTile: [1, 1] };
    G.eventState.deferredEvents = [rebellionEvent, battleEvent];
    const events = stubEvents();

    setupNextDeferredBattle(G, events as any);

    // Should pick the faerie_uprising, not the rebellion
    expect(G.currentDeferredBattle).not.toBeNull();
    expect(G.currentDeferredBattle!.event.card).toBe("faerie_uprising");
    // Rebellion event should remain in the deferred list
    expect(G.eventState.deferredEvents).toHaveLength(1);
    expect(G.eventState.deferredEvents[0].card).toBe("colonial_rebellion");
  });

  it("when no deferred battles remain, continues to next flow stage", () => {
    const G = buildInitialG();
    G.eventState.deferredEvents = [];
    const events = stubEvents();

    setupNextDeferredBattle(G, events as any);

    // No deferred battle set up
    expect(G.currentDeferredBattle).toBeNull();
    // Should have called endTurn (for retrieve fleets or rebellion/invasion flow)
    expect(events.endTurn).toHaveBeenCalled();
  });

  it("when only rebellion events remain, does not set currentDeferredBattle", () => {
    const G = buildInitialG();
    const rebellionEvent: DeferredEvent = { card: "colonial_rebellion" as any, targetPlayerID: "0", targetTile: [0, 0] };
    G.eventState.deferredEvents = [rebellionEvent];
    const events = stubEvents();

    setupNextDeferredBattle(G, events as any);

    // Should not set up a deferred battle (rebellion is handled differently)
    expect(G.currentDeferredBattle).toBeNull();
  });
});
