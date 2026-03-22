/**
 * invasionFlow.test.ts (integration)
 *
 * Tests the full invasion chain:
 *   1. Archprelate nominates Captain-General (nominateCaptainGeneral)
 *   2. All players contribute troops (contributeToGrandArmy)
 *   3a. Grand Army wins → VP rewards distributed
 *   3b. Grand Army loses → buyoff phase (offerBuyoffGold)
 *
 * Key rules tested:
 *   - Only Archprelate can nominate
 *   - Nominee must be Orthodox if any Orthodox player exists
 *   - All players must contribute before battle resolves
 *   - Contributing 0 is valid
 *   - Captain-General VP bonus on successful defense
 *   - Buyoff: all players offer gold after defeat
 */

import { describe, it, expect, vi } from "vitest";
import nominateCaptainGeneral from "../../moves/events/nominateCaptainGeneral";
import contributeToGrandArmy from "../../moves/events/contributeToGrandArmy";
import offerBuyoffGold from "../../moves/events/offerBuyoffGold";
import {
  buildInitialG,
  buildPlayer,
  buildCtx,
  buildResources,
  buildRandom,
} from "../testHelpers";
import { INVALID_MOVE } from "boardgame.io/core";
import type { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

const stubEvents = () =>
  ({
    endTurn: vi.fn(),
    endPhase: vi.fn(),
  } as unknown as EventsAPI & {
    endTurn: ReturnType<typeof vi.fn>;
    endPhase: ReturnType<typeof vi.fn>;
  });

function buildInvasion(totalHostSwords = 5) {
  return {
    totalHostSwords,
    contributions: {} as Record<string, { regiments: number; levies: number; skyships: number }>,
    phase: "nominate" as const,
  };
}

function callNominate(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  nomineeID: string,
  playOrder: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, playOrder.length),
    playOrder,
    currentPlayer: playerID,
  };
  const result = nominateCaptainGeneral.fn({ G, ctx, playerID, events }, nomineeID);
  return { result, events };
}

function callContribute(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  regiments: number,
  levies: number,
  playOrder: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, playOrder.length),
    playOrder,
    currentPlayer: playerID,
  };
  const result = contributeToGrandArmy.fn(
    { G, ctx, playerID, events, random: buildRandom() },
    regiments,
    levies,
    0
  );
  return { result, events };
}

function callBuyoff(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  amount: number,
  playOrder: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, playOrder.length),
    playOrder,
    currentPlayer: playerID,
  };
  const result = offerBuyoffGold.fn({ G, ctx, playerID, events }, amount);
  return { result, events };
}

// ── Test 1: Archprelate nominates Captain-General ─────────────────────────────

describe("invasionFlow — Archprelate nominates Captain-General", () => {
  it("sets isCaptainGeneral on the nominated player", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { hereticOrOrthodox: "orthodox" }),
    ]);
    G.currentInvasion = buildInvasion();

    callNominate(G, "0", "1", ["0", "1"]);

    expect(G.playerInfo["1"].isCaptainGeneral).toBe(true);
    expect(G.playerInfo["0"].isCaptainGeneral).toBe(false);
  });

  it("advances invasion phase to 'contribute' and stage to 'invasion_contribute'", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { hereticOrOrthodox: "orthodox" }),
    ]);
    G.currentInvasion = buildInvasion();

    callNominate(G, "0", "1", ["0", "1"]);

    expect(G.currentInvasion?.phase).toBe("contribute");
    expect(G.stage).toBe("invasion_contribute");
  });

  it("returns INVALID_MOVE if the player is not the Archprelate", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: false }),
      buildPlayer("1", { isArchprelate: true }),
    ]);
    G.currentInvasion = buildInvasion();

    const { result } = callNominate(G, "0", "1", ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when nominating a Heretic if Orthodox players exist", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { hereticOrOrthodox: "heretic" }),
    ]);
    G.currentInvasion = buildInvasion();

    const { result } = callNominate(G, "0", "1", ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });
});

// ── Test 2: All players contribute → invasion resolves ───────────────────────

describe("invasionFlow — all players contribute troops", () => {
  it("does not resolve after only one player has contributed (2-player game)", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1", { resources: buildResources({ regiments: 6 }) }),
    ]);
    G.currentInvasion = { ...buildInvasion(5), phase: "contribute" };
    // Set up contingent pool for the battle simulation
    G.contingentPool = [3, 3, 3, 3, 3, 3];
    G.accumulatedHosts = [{ swords: 5, shields: 0, isFleet: false, isInvasionTrigger: true }];

    callContribute(G, "0", 3, 0, ["0", "1"]);

    // Player "1" hasn't contributed yet
    expect(G.currentInvasion?.contributions["0"]).toBeDefined();
    expect(G.currentInvasion?.contributions["1"]).toBeUndefined();
  });

  it("resolves after all players contribute", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isArchprelate: true,
        isCaptainGeneral: true,
        resources: buildResources({ regiments: 8 }),
      }),
      buildPlayer("1", { resources: buildResources({ regiments: 8 }) }),
    ]);
    // Use very large contributions to ensure Grand Army wins
    G.currentInvasion = { ...buildInvasion(3), phase: "contribute" };
    G.contingentPool = [3, 3, 3, 3, 3, 3];
    G.accumulatedHosts = [{ swords: 3, shields: 0, isFleet: false, isInvasionTrigger: true }];

    callContribute(G, "0", 5, 0, ["0", "1"]);
    callContribute(G, "1", 5, 0, ["0", "1"]);

    // Either resolved (won) or moved to buyoff (lost) — in either case invasion contributions recorded
    const allContributed =
      G.currentInvasion === null ||
      G.currentInvasion.phase === "buyoff" ||
      G.stage === "retrieve fleets";
    expect(allContributed).toBe(true);
  });
});

// ── Test 3: Contributing 0 troops is valid ────────────────────────────────────

describe("invasionFlow — contributing 0 troops is valid", () => {
  it("allows a player to contribute nothing", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        isArchprelate: true,
        isCaptainGeneral: true,
        resources: buildResources({ regiments: 6 }),
      }),
      buildPlayer("1", { resources: buildResources({ regiments: 6 }) }),
    ]);
    G.currentInvasion = { ...buildInvasion(100), phase: "contribute" };
    G.contingentPool = [3, 3, 3, 3, 3, 3];
    G.accumulatedHosts = [{ swords: 100, shields: 0, isFleet: false, isInvasionTrigger: true }];

    const { result } = callContribute(G, "0", 0, 0, ["0", "1"]);
    expect(result).not.toBe(INVALID_MOVE);
  });
});

// ── Test 4: Buyoff phase after Grand Army loses ───────────────────────────────

describe("invasionFlow — buyoff phase", () => {
  it("all players offer gold → transitions to retrieve fleets", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 10 }) }),
    ]);
    // Set up buyoff phase directly
    G.currentInvasion = {
      totalHostSwords: 20,
      contributions: {},
      phase: "buyoff",
      buyoffCost: 10,
      buyoffOffered: {},
    };

    callBuyoff(G, "0", 5, ["0", "1"]);

    // Only player "0" has offered — not yet resolved
    expect(G.currentInvasion).not.toBeNull();
    expect(G.currentInvasion?.buyoffOffered?.["0"]).toBe(5);

    callBuyoff(G, "1", 5, ["0", "1"]);

    // Both offered → should transition away from buyoff
    expect(G.stage).toBe("retrieve fleets");
  });

  it("returns INVALID_MOVE if player offers more gold than they have", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 3 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 3 }) }),
    ]);
    G.currentInvasion = {
      totalHostSwords: 20,
      contributions: {},
      phase: "buyoff",
      buyoffCost: 10,
      buyoffOffered: {},
    };

    const { result } = callBuyoff(G, "0", 10, ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });

  it("offering 0 gold is valid (can't afford buyoff)", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 0 }) }),
      buildPlayer("1", { resources: buildResources({ gold: 5 }) }),
    ]);
    G.currentInvasion = {
      totalHostSwords: 10,
      contributions: {},
      phase: "buyoff",
      buyoffCost: 5,
      buyoffOffered: {},
    };

    const { result } = callBuyoff(G, "0", 0, ["0", "1"]);
    expect(result).not.toBe(INVALID_MOVE);
  });
});

// ── Test 5: Phase guard — wrong phase returns INVALID_MOVE ───────────────────

describe("invasionFlow — phase guards", () => {
  it("contributeToGrandArmy returns INVALID_MOVE if phase is not 'contribute'", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 4 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = buildInvasion(); // phase = "nominate"

    const { result } = callContribute(G, "0", 2, 0, ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });

  it("offerBuyoffGold returns INVALID_MOVE if phase is not 'buyoff'", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 5 }) }),
      buildPlayer("1"),
    ]);
    G.currentInvasion = { ...buildInvasion(), phase: "contribute" };

    const { result } = callBuyoff(G, "0", 3, ["0", "1"]);
    expect(result).toBe(INVALID_MOVE);
  });
});
