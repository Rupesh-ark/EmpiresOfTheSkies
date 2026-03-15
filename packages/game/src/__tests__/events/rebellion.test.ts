/**
 * rebellion.test.ts
 *
 * Tests for the rebellion interactive system:
 * - commitRebellionTroops: defender chooses troops + optional FoW card
 * - contributeToRebellion: rivals choose side + troops (max 3)
 */

import { describe, it, expect, vi } from "vitest";
import commitRebellionTroops from "../../moves/events/commitRebellionTroops";
import contributeToRebellion from "../../moves/events/contributeToRebellion";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";
import { INVALID_MOVE } from "boardgame.io/core";

const stubEvents = () => ({ endTurn: vi.fn(), endPhase: vi.fn() });

function buildRebellion(targetPlayerID: string, counterSwords = 7) {
  return {
    event: { card: "pretender_rebellion" as const, targetPlayerID },
    counterSwords,
  };
}

function callCommit(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  regiments: number,
  levies: number,
  fowCardIndex?: number,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const result = (commitRebellionTroops as Function)(
    { G, ctx, playerID, events, random: { Shuffle: <T>(a: T[]) => a } },
    regiments,
    levies,
    fowCardIndex
  );
  return { result, events };
}

function callContribute(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  side: "defender" | "rebel",
  regiments: number,
  levies: number,
  playOrder?: string[]
) {
  const events = stubEvents();
  const ctx = {
    ...buildCtx(playerID, Object.keys(G.playerInfo).length),
    playOrder: playOrder ?? Object.keys(G.playerInfo),
  };
  const result = (contributeToRebellion as Function)(
    { G, ctx, playerID, events, random: { Shuffle: <T>(a: T[]) => a } },
    side,
    regiments,
    levies
  );
  return { result, events };
}

// ── commitRebellionTroops ───────────────────────────────────────────────────

describe("commitRebellionTroops — validation", () => {
  it("returns INVALID_MOVE if no currentRebellion", () => {
    const G = buildInitialG();
    G.currentRebellion = null;
    const { result } = callCommit(G, "0", 2, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if player is not the rebellion target", () => {
    const G = buildInitialG();
    G.currentRebellion = buildRebellion("0");
    const { result } = callCommit(G, "1", 2, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if regiments are negative", () => {
    const G = buildInitialG();
    G.currentRebellion = buildRebellion("0");
    const { result } = callCommit(G, "0", -1, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if levies are negative", () => {
    const G = buildInitialG();
    G.currentRebellion = buildRebellion("0");
    const { result } = callCommit(G, "0", 0, -1);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if regiments exceed available", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 3 }) }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    const { result } = callCommit(G, "0", 4, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if levies exceed available", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ levies: 2 }) }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    const { result } = callCommit(G, "0", 0, 3);
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("commitRebellionTroops — state mutations", () => {
  it("stores chosen regiments and levies on the rebellion", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6, levies: 3 }) }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    callCommit(G, "0", 4, 2);
    expect(G.currentRebellion!.defenderRegiments).toBe(4);
    expect(G.currentRebellion!.defenderLevies).toBe(2);
  });

  it("initializes rivalContributions as empty object", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    callCommit(G, "0", 3, 0);
    expect(G.currentRebellion!.rivalContributions).toEqual({});
  });

  it("pulls FoW card from hand when index is provided", () => {
    const fowCard = { name: "Battle of Elves", sword: 3, shield: 2, flipped: false };
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({
          regiments: 6,
          fortuneCards: [fowCard],
        }),
      }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    callCommit(G, "0", 3, 0, 0);

    // Card removed from hand
    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(0);
    // Card stored on rebellion
    expect(G.currentRebellion!.fowCard).toEqual({
      name: "Battle of Elves",
      sword: 3,
      shield: 2,
    });
  });

  it("does not store FoW card when index is undefined", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        resources: buildResources({
          regiments: 6,
          fortuneCards: [{ name: "test", sword: 1, shield: 1, flipped: false }],
        }),
      }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    callCommit(G, "0", 3, 0, undefined);
    expect(G.currentRebellion!.fowCard).toBeUndefined();
    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(1);
  });

  it("committing 0 troops is valid", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    const { result } = callCommit(G, "0", 0, 0);
    expect(result).not.toBe(INVALID_MOVE);
  });
});

describe("commitRebellionTroops — flow control", () => {
  it("transitions to rival support stage when rivals exist", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    const { events } = callCommit(G, "0", 3, 0, undefined, ["0", "1"]);
    expect(G.stage).toBe("rebellion_rival_support");
    expect(events.endTurn).toHaveBeenCalledWith({ next: "1" });
  });

  it("resolves immediately with only 1 player (no rivals)", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6 }) }),
    ]);
    G.currentRebellion = buildRebellion("0");
    G.contingentPool = [10]; // needed for resolution
    callCommit(G, "0", 3, 0, undefined, ["0"]);
    // With no rivals, rebellion resolves immediately and clears
    expect(G.currentRebellion).toBeNull();
  });
});

// ── contributeToRebellion ───────────────────────────────────────────────────

describe("contributeToRebellion — validation", () => {
  it("returns INVALID_MOVE if no currentRebellion", () => {
    const G = buildInitialG();
    G.currentRebellion = null;
    const { result } = callContribute(G, "1", "defender", 1, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if player IS the target", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1"),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };
    const { result } = callContribute(G, "0", "defender", 1, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if no rivalContributions object", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1"),
    ]);
    G.currentRebellion = buildRebellion("0");
    // rivalContributions not set
    const { result } = callContribute(G, "1", "defender", 1, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if regiments + levies > 3 (MAX_RIVAL_TROOPS)", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1", { resources: buildResources({ regiments: 6, levies: 3 }) }),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };
    const { result } = callContribute(G, "1", "defender", 2, 2);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if regiments exceed available", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1", { resources: buildResources({ regiments: 1 }) }),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };
    const { result } = callContribute(G, "1", "defender", 2, 0);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE if negative troops", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1"),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };
    const { result } = callContribute(G, "1", "defender", -1, 0);
    expect(result).toBe(INVALID_MOVE);
  });
});

describe("contributeToRebellion — state mutations", () => {
  it("records contribution with side choice", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1", { resources: buildResources({ regiments: 6, levies: 3 }) }),
      buildPlayer("2"),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };
    callContribute(G, "1", "rebel", 2, 1, ["0", "1", "2"]);
    expect(G.currentRebellion!.rivalContributions!["1"]).toEqual({
      side: "rebel",
      regiments: 2,
      levies: 1,
    });
  });

  it("contributing 0 troops is valid (stays out)", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1"),
      buildPlayer("2"),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };
    const { result } = callContribute(G, "1", "defender", 0, 0, ["0", "1", "2"]);
    expect(result).not.toBe(INVALID_MOVE);
    expect(G.currentRebellion!.rivalContributions!["1"]).toEqual({
      side: "defender",
      regiments: 0,
      levies: 0,
    });
  });
});

describe("contributeToRebellion — flow control", () => {
  it("advances to next rival in IPO when not all have contributed", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1", { resources: buildResources({ regiments: 6 }) }),
      buildPlayer("2"),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };
    const { events } = callContribute(G, "1", "defender", 1, 0, ["0", "1", "2"]);
    expect(events.endTurn).toHaveBeenCalledWith({ next: "2" });
  });

  it("resolves rebellion and clears state when all rivals contributed", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6 }) }),
      buildPlayer("1", { resources: buildResources({ regiments: 6 }) }),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };
    G.contingentPool = [10]; // needed for resolution flow
    callContribute(G, "1", "defender", 1, 0, ["0", "1"]);
    // All rivals (just "1") have contributed → rebellion resolves
    expect(G.currentRebellion).toBeNull();
  });
});
