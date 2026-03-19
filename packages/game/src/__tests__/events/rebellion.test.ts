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
import {
  resolveRebellionWithTroops,
  resolveRebellionWithTroopsAndRivals,
} from "../../helpers/resolveRebellion";
import { buildInitialG, buildPlayer, buildCtx, buildResources, buildRandom } from "../testHelpers";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState, MapBuildingInfo } from "../../types";

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
  const result = commitRebellionTroops.fn(
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
  const result = contributeToRebellion.fn(
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

// ── Helpers for fort / battle tests ──────────────────────────────────────────

/** Build a minimal 1-row x 8-col buildings grid so KINGDOM_LOCATION [4,0] is valid */
function buildBuildingsGrid(): MapBuildingInfo[][] {
  const COLS = 8;
  const row: MapBuildingInfo[] = [];
  for (let c = 0; c < COLS; c++) {
    row.push({ fort: false, garrisonedRegiments: 0, garrisonedLevies: 0, garrisonedEliteRegiments: 0 });
  }
  return [row];
}

/** Seed the FoW deck with deterministic cards (0 sword / 0 shield = "No Effect" which redraws, so use 1/0) */
function seedFowDeck(G: MyGameState, cards: Array<{ sword: number; shield: number }>) {
  G.cardDecks.fortuneOfWarCards = cards.map((c) => ({
    name: "test",
    sword: c.sword,
    shield: c.shield,
    flipped: false,
  }));
  G.cardDecks.discardedFortuneOfWarCards = [];
}

// ── Fort bonus in non-colonial rebellions ────────────────────────────────────

describe("resolveRebellionWithTroops — fort bonus at Kingdom location", () => {
  it("fort at Kingdom grants shield bonus, reducing defender losses", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 3, levies: 0 }) }),
      buildPlayer("1"),
    ]);
    G.mapState.buildings = buildBuildingsGrid();
    // Place fort at KINGDOM_LOCATION [4,0] → buildings[0][4]
    G.mapState.buildings[0][4].fort = true;

    // Rebel: 6 swords, FoW gives rebel 2S/0Sh, defender 0S/0Sh
    // Defender: 3 reg = 6S, fort shields = 3 (one per reg)
    // Hits on defender = (6 + 2) - (3 + 0) = 5 → but defHP = 6 so defender survives
    // Without fort: hits on defender = (6 + 2) - 0 = 8 → defHP = 6, defender eliminated
    seedFowDeck(G, [
      { sword: 2, shield: 0 },  // rebel FoW
      { sword: 0, shield: 0 },  // this is "No Effect" — will be skipped/redrawn
      { sword: 1, shield: 0 },  // defender FoW (after redraw)
    ]);

    // Actually, "No Effect" triggers a reshuffle+redraw, which is complex.
    // Use non-zero cards to keep it simple:
    seedFowDeck(G, [
      { sword: 2, shield: 0 },  // rebel FoW
      { sword: 0, shield: 1 },  // defender FoW
    ]);

    const rebellion = {
      event: { card: "pretender_rebellion", targetPlayerID: "0" },
      counterSwords: 6,
    };

    // With fort: rebel swords = 6+2 = 8, defender shields = 3 (fort) + 1 (FoW) = 4
    // hitsOnDefender = 8 - 4 = 4; defHP = 6 → defender survives
    resolveRebellionWithTroops(G, rebellion as any, 3, 0, buildRandom().Shuffle);

    // Defender should survive (fort shielded enough)
    // Troop losses: 4 hits on 3 reg (6HP) → 0 levies lost, 2 reg lost (4/2=2)
    expect(G.playerInfo["0"].resources.regiments).toBe(1);
  });

  it("no fort at Kingdom means no shield bonus, defender takes full hits", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 3, levies: 0 }) }),
      buildPlayer("1"),
    ]);
    G.mapState.buildings = buildBuildingsGrid();
    // No fort at Kingdom location
    G.mapState.buildings[0][4].fort = false;

    seedFowDeck(G, [
      { sword: 2, shield: 0 },  // rebel FoW
      { sword: 0, shield: 1 },  // defender FoW
    ]);

    const rebellion = {
      event: { card: "pretender_rebellion", targetPlayerID: "0" },
      counterSwords: 6,
    };

    // Without fort: rebel swords = 6+2 = 8, defender shields = 0 + 1 (FoW) = 1
    // hitsOnDefender = 8 - 1 = 7; defHP = 6 → defender eliminated (rebels win)
    resolveRebellionWithTroops(G, rebellion as any, 3, 0, buildRandom().Shuffle);

    // All troops lost (7 hits >= 6 HP)
    expect(G.playerInfo["0"].resources.regiments).toBe(0);
  });
});

// ── Rival troop deduction on contribute ──────────────────────────────────────

describe("contributeToRebellion — troop deduction", () => {
  it("deducts regiments and levies from rival's kingdom resources on commit", () => {
    const G = buildInitialG([
      buildPlayer("0"),
      buildPlayer("1", { resources: buildResources({ regiments: 5, levies: 2 }) }),
      buildPlayer("2"),
    ]);
    G.currentRebellion = {
      ...buildRebellion("0"),
      defenderRegiments: 3,
      defenderLevies: 0,
      rivalContributions: {},
    };

    callContribute(G, "1", "defender", 2, 1, ["0", "1", "2"]);

    // Troops should be deducted immediately
    expect(G.playerInfo["1"].resources.regiments).toBe(3); // 5 - 2
    expect(G.playerInfo["1"].resources.levies).toBe(1);    // 2 - 1
  });
});

// ── Rival troop return on winning side / loss on losing side ─────────────────

describe("resolveRebellionWithTroopsAndRivals — rival troop return", () => {
  it("returns winning-side rival troops after defender wins", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 4, levies: 0 }) }),
      buildPlayer("1", { resources: buildResources({ regiments: 3, levies: 1 }) }),
    ]);
    G.mapState.buildings = buildBuildingsGrid();

    // Seed FoW cards: rebel gets weak, defender gets strong → defender wins
    seedFowDeck(G, [
      { sword: 0, shield: 1 },  // rebel FoW (weak)
      { sword: 3, shield: 2 },  // defender FoW (strong)
    ]);

    // Player "1" already had troops deducted (simulating contribute move):
    // They committed 2R/1L to defender side. Resources already reduced above.
    const rebellion: MyGameState["currentRebellion"] = {
      event: { card: "pretender_rebellion", targetPlayerID: "0" },
      counterSwords: 3,   // weak rebel
      defenderRegiments: 4,
      defenderLevies: 0,
      rivalContributions: {
        "1": { side: "defender", regiments: 2, levies: 1 },
      },
    };
    G.currentRebellion = rebellion;

    // Defender swords = 4*2 + 0 + rival(2*2+1=5) = 13, + FoW 3 = 16
    // Rebel swords = 3 + FoW 0 = 3
    // Defender definitely wins — rival on winning side gets troops back
    resolveRebellionWithTroopsAndRivals(G, rebellion!, buildRandom().Shuffle);

    // Rival "1" should get 2R/1L returned
    expect(G.playerInfo["1"].resources.regiments).toBe(3 + 2); // 3 remaining + 2 returned
    expect(G.playerInfo["1"].resources.levies).toBe(1 + 1);    // 1 remaining + 1 returned
  });

  it("does NOT return losing-side rival troops (they are lost)", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 1, levies: 0 }) }),
      buildPlayer("1", { resources: buildResources({ regiments: 3, levies: 0 }) }),
    ]);
    G.mapState.buildings = buildBuildingsGrid();

    // Seed FoW: rebel strong, defender weak → rebels win
    seedFowDeck(G, [
      { sword: 4, shield: 2 },  // rebel FoW (strong)
      { sword: 0, shield: 0 },  // "No Effect" → redrawn
      { sword: 1, shield: 0 },  // actual defender FoW after redraw
    ]);
    // Avoid No Effect complexity — use non-zero:
    seedFowDeck(G, [
      { sword: 4, shield: 2 },  // rebel FoW
      { sword: 0, shield: 1 },  // defender FoW (weak)
    ]);

    // Player "1" contributed 2R to defender side (already deducted)
    const rebellion: MyGameState["currentRebellion"] = {
      event: { card: "pretender_rebellion", targetPlayerID: "0" },
      counterSwords: 10,   // strong rebel
      defenderRegiments: 1,
      defenderLevies: 0,
      rivalContributions: {
        "1": { side: "defender", regiments: 2, levies: 0 },
      },
    };
    G.currentRebellion = rebellion;

    // Rebel swords = 10 + FoW 4 = 14
    // Defender swords = 1*2 + rival(2*2=4) = 6, + FoW 0 = 6
    // Defender shields = 0 (no fort) + FoW 1 = 1
    // hitsOnDefender = 14 - 1 = 13; defHP = 1*2+0+4 = 6 → eliminated
    // hitsOnRebel = 6 - 2 = 4; rebelHP = 10+0 = 10 → not eliminated
    // Rebels win → defender-side rival troops are lost
    resolveRebellionWithTroopsAndRivals(G, rebellion!, buildRandom().Shuffle);

    // Rival "1" was on the losing (defender) side: troops NOT returned
    expect(G.playerInfo["1"].resources.regiments).toBe(3); // unchanged — 2R already deducted, not returned
  });
});
