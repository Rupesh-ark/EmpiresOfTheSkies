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
import { buildInitialG, buildPlayer, buildCtx, buildResources, buildFleet } from "../testHelpers";
import { INVALID_MOVE } from "boardgame.io/core";

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
  const result = (respondToInfidelFleet as Function)(
    { G, ctx, playerID, events },
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
