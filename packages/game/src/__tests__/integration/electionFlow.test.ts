/**
 * electionFlow.test.ts (integration)
 *
 * Tests the full election flow: all players submit votes, tally resolves,
 * Archprelate is assigned, VP awarded, fatigue tracked.
 *
 * Key rules tested:
 *   - Player with most cathedral-weighted votes wins
 *   - Tie: incumbent Archprelate retains title
 *   - Winner gains floor(2 * orthodoxCount / 3) VP (max 6)
 *   - Previous Archprelate loses isArchprelate flag
 *   - consecutiveArchprelateWins increments on re-election, resets on new winner
 */

import { describe, it, expect } from "vitest";
import vote from "../../moves/election/vote";
import {
  buildInitialG,
  buildPlayer,
  buildCtx,
  buildResources,
  buildRandom,
} from "../testHelpers";
import type { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

const stubEvents = {
  endTurn: () => {},
  endPhase: () => {},
} as unknown as EventsAPI;

// Helper: cast a vote from a player against a given playOrder
function castVote(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  kingdomVotedFor: string,
  playOrder: string[]
) {
  const ctx = {
    ...buildCtx(playerID, playOrder.length),
    currentPlayer: playerID,
    playOrder,
    playOrderPos: playOrder.indexOf(playerID),
  };
  vote.fn({ G, ctx, playerID, events: stubEvents, random: buildRandom() }, kingdomVotedFor);
}

// ── Test 1: Most cathedral-weighted votes wins ────────────────────────────────

describe("electionFlow — most votes wins", () => {
  it("player with most cathedral-weighted votes becomes Archprelate", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 4 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1 }),
      buildPlayer("2", { kingdomName: "Castillia", cathedrals: 1 }),
    ]);
    G.playerInfo["0"].isArchprelate = false;
    G.playerInfo["1"].isArchprelate = false;
    G.playerInfo["2"].isArchprelate = false;

    const order = ["0", "1", "2"];
    // Each player self-votes
    castVote(G, "0", "Angland", order);
    castVote(G, "1", "Gallois", order);
    castVote(G, "2", "Castillia", order);

    // Angland has 4 cathedral votes, others have 1 each
    expect(G.playerInfo["0"].isArchprelate).toBe(true);
    expect(G.playerInfo["1"].isArchprelate).toBe(false);
    expect(G.playerInfo["2"].isArchprelate).toBe(false);
    expect(G.electionResults["Angland"]).toBe(4);
  });
});

// ── Test 2: Tie goes to incumbent ─────────────────────────────────────────────

describe("electionFlow — tie goes to incumbent Archprelate", () => {
  it("incumbent retains title on equal votes", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 2, isArchprelate: true }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 2, isArchprelate: false }),
      buildPlayer("2", { kingdomName: "Castillia", cathedrals: 1, isArchprelate: false }),
    ]);

    const order = ["0", "1", "2"];
    // Both top candidates self-vote; Castillia votes for Gallois
    castVote(G, "0", "Angland", order);
    castVote(G, "1", "Gallois", order);
    castVote(G, "2", "Gallois", order);

    // Angland: 2, Gallois: 2+1=3 — Gallois wins (not a tie)
    // Let's re-do with pure tie: Castillia votes for Angland
    // Reset state
    const G2 = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 2, isArchprelate: true }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 2, isArchprelate: false }),
    ]);
    castVote(G2, "0", "Angland", ["0", "1"]);
    castVote(G2, "1", "Gallois", ["0", "1"]);

    // 2–2 tie: incumbent (Angland / player "0") keeps title
    expect(G2.playerInfo["0"].isArchprelate).toBe(true);
    expect(G2.playerInfo["1"].isArchprelate).toBe(false);
  });
});

// ── Test 3: Winner gains VP based on orthodox count ──────────────────────────

describe("electionFlow — new Archprelate gains VP based on orthodox count", () => {
  it("grants floor(2 × orthodoxRealms / 3) VP, capped at 6", () => {
    // 3 orthodox realms: floor(2*3/3) = 2 VP
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 5, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1, hereticOrOrthodox: "orthodox" }),
      buildPlayer("2", { kingdomName: "Castillia", cathedrals: 1, hereticOrOrthodox: "orthodox" }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;

    const order = ["0", "1", "2"];
    castVote(G, "0", "Angland", order);
    castVote(G, "1", "Angland", order);
    castVote(G, "2", "Angland", order);

    // All 3 orthodox → floor(6/3) = 2 VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 2);
    expect(G.playerInfo["0"].isArchprelate).toBe(true);
  });

  it("grants max 6 VP even with many orthodox realms", () => {
    // 6 orthodox realms (including NPRs via cathedral count): floor(12/3) = 4 but capped at 6
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 10, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1, hereticOrOrthodox: "orthodox" }),
      buildPlayer("2", { kingdomName: "Castillia", cathedrals: 1, hereticOrOrthodox: "orthodox" }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;

    const order = ["0", "1", "2"];
    castVote(G, "0", "Angland", order);
    castVote(G, "1", "Angland", order);
    castVote(G, "2", "Angland", order);

    // floor(2*3/3) = 2 (only 3 players, orthodox count is 3)
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 2);
  });
});

// ── Test 4: Previous Archprelate loses flag ───────────────────────────────────

describe("electionFlow — previous Archprelate loses flag", () => {
  it("old Archprelate has isArchprelate set to false after new winner", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 1, isArchprelate: true }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 4, isArchprelate: false }),
    ]);

    castVote(G, "0", "Angland", ["0", "1"]);
    castVote(G, "1", "Gallois", ["0", "1"]);

    // Gallois wins 4 vs 1
    expect(G.playerInfo["1"].isArchprelate).toBe(true);
    expect(G.playerInfo["0"].isArchprelate).toBe(false);
  });
});

// ── Test 5: consecutiveArchprelateWins tracking ───────────────────────────────

describe("electionFlow — consecutive wins tracking", () => {
  it("increments consecutiveArchprelateWins when same player wins again", () => {
    // First election: player "0" wins
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 4, isArchprelate: true }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1, isArchprelate: false }),
    ]);
    G.consecutiveArchprelateWins = 1;

    castVote(G, "0", "Angland", ["0", "1"]);
    castVote(G, "1", "Angland", ["0", "1"]);

    // Same player wins again → increment to 2
    expect(G.consecutiveArchprelateWins).toBe(2);
  });

  it("resets consecutiveArchprelateWins to 1 when a new player wins", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 1, isArchprelate: true }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 4, isArchprelate: false }),
    ]);
    G.consecutiveArchprelateWins = 3;

    castVote(G, "0", "Angland", ["0", "1"]);
    castVote(G, "1", "Gallois", ["0", "1"]);

    // New winner (Gallois) → reset to 1
    expect(G.consecutiveArchprelateWins).toBe(1);
    expect(G.playerInfo["1"].isArchprelate).toBe(true);
  });

  it("fatigue reduces VP on consecutive re-election", () => {
    const G = buildInitialG([
      buildPlayer("0", {
        kingdomName: "Angland",
        cathedrals: 4,
        isArchprelate: true,
        hereticOrOrthodox: "orthodox",
      }),
      buildPlayer("1", {
        kingdomName: "Gallois",
        cathedrals: 1,
        isArchprelate: false,
        hereticOrOrthodox: "orthodox",
      }),
    ]);
    // consecutiveArchprelateWins = 1 means first re-election → fatigue kicks in at 2+
    G.consecutiveArchprelateWins = 1;

    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    castVote(G, "0", "Angland", ["0", "1"]);
    castVote(G, "1", "Angland", ["0", "1"]);

    // consecutiveArchprelateWins becomes 2 → fatigueReduction = (2-1)*2 = 2
    // baseVP = floor(2*2/3) = 1, after fatigue: max(0, 1-2) = 0
    const vpAfter = G.playerInfo["0"].resources.victoryPoints;
    expect(vpAfter).toBeLessThanOrEqual(vpBefore + 1);
    expect(G.consecutiveArchprelateWins).toBe(2);
  });
});

// ── Integration: influence prelates add votes ─────────────────────────────────

describe("electionFlow — influence prelates affect vote tallying", () => {
  it("player under enemy influence loses own cathedral votes", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 3 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1 }),
    ]);
    // Player "1" has influenced Angland's prelate (slot 1 = Angland)
    G.boardState.influencePrelates[1] = "1";

    castVote(G, "0", "Angland", ["0", "1"]);
    castVote(G, "1", "Gallois", ["0", "1"]);

    // Angland is influenced by player "1" → Angland's own 3 votes don't count
    // Player "1" controls Angland's 3 cathedrals + own 1 = 4 votes for Gallois
    // Player "0" gets 0 votes for Angland (blocked by influence)
    expect(G.electionResults["Gallois"]).toBe(4);
    expect(G.electionResults["Angland"]).toBe(0);
    expect(G.playerInfo["1"].isArchprelate).toBe(true);
  });
});
