/**
 * vote.test.ts
 *
 * Tests for the vote move (v4.2, election phase).
 *
 * Rules:
 *   - All players vote simultaneously (activePlayers stage)
 *   - Votes are stored in G.voteSubmitted[playerID] until everyone has voted
 *   - Only after ALL players vote are totals tallied into G.electionResults
 *   - Votes come from: own cathedrals (if own kingdom is not under enemy influence)
 *     plus cathedrals of any kingdom under their influence, plus +1 for Zeeland/Venoa
 *   - After tally, the kingdom with most votes becomes Archprelate
 *   - On tie: the current Archprelate retains the title
 *   - New Archprelate gains floor(2 × orthodoxKingdoms / 3) VP (max 6)
 *   - All other players lose isArchprelate
 *   - Player is added to hasVoted after casting vote
 */

import { describe, it, expect } from "vitest";
import vote from "../../moves/election/vote";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";

const stubEvents = { endTurn: () => {}, endPhase: () => {} } as any;

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, kingdomVotedFor: string) {
  const ctx = {
    ...buildCtx(playerID),
    currentPlayer: playerID,
    playOrder: Object.keys(G.playerInfo),
    playOrderPos: Object.keys(G.playerInfo).indexOf(playerID),
  };
  return vote.fn({ G, ctx, playerID, events: stubEvents, random: {} }, kingdomVotedFor);
}

function callMoveWithPlayOrder(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  kingdomVotedFor: string,
  playOrder: string[]
) {
  const ctx = {
    ...buildCtx(playerID),
    currentPlayer: playerID,
    playOrder,
    playOrderPos: playOrder.indexOf(playerID),
  };
  return vote.fn({ G, ctx, playerID, events: stubEvents, random: {} }, kingdomVotedFor);
}

describe("vote — ballot storage (before all players have voted)", () => {
  it("stores the vote in voteSubmitted, not yet in electionResults", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 3 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1 }),
    ]);
    // Only player "0" votes — player "1" has not yet
    callMoveWithPlayOrder(G, "0", "Angland", ["0", "1"]);
    // Ballot is stored, but tally has NOT run yet
    expect(G.voteSubmitted["0"]).toBe("Angland");
    expect(G.electionResults["Angland"]).toBeUndefined();
  });

  it("adds player to hasVoted after voting", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 1 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1 }),
    ]);
    callMoveWithPlayOrder(G, "0", "Angland", ["0", "1"]);
    expect(G.hasVoted).toContain("0");
  });
});

describe("vote — tally fires only when all players have voted", () => {
  it("accumulates votes across players voting for the same kingdom (2 players)", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 2 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 3 }),
    ]);
    callMoveWithPlayOrder(G, "0", "Angland", ["0", "1"]);
    callMoveWithPlayOrder(G, "1", "Angland", ["0", "1"]);
    // Both voted — tally fires: 2 + 3 = 5
    expect(G.electionResults["Angland"]).toBe(5);
  });
});

describe("vote — Archprelate assignment (all players voted)", () => {
  it("assigns isArchprelate to the kingdom with the most votes", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 4 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1 }),
    ]);
    callMoveWithPlayOrder(G, "0", "Angland", ["0", "1"]);
    callMoveWithPlayOrder(G, "1", "Gallois", ["0", "1"]);
    expect(G.playerInfo["0"].isArchprelate).toBe(true);
    expect(G.playerInfo["1"].isArchprelate).toBe(false);
  });

  it("on tie: current Archprelate retains title", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 2, isArchprelate: true }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 2, isArchprelate: false }),
    ]);
    callMoveWithPlayOrder(G, "0", "Angland", ["0", "1"]);
    callMoveWithPlayOrder(G, "1", "Gallois", ["0", "1"]);
    // Tied at 2–2: current Archprelate (player "0") keeps title
    expect(G.playerInfo["0"].isArchprelate).toBe(true);
    expect(G.playerInfo["1"].isArchprelate).toBe(false);
  });

  it("new Archprelate gains floor(2 * orthodoxCount / 3) VP", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 4, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1, hereticOrOrthodox: "orthodox" }),
      buildPlayer("2", { kingdomName: "Castillia", cathedrals: 1, hereticOrOrthodox: "orthodox" }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    callMoveWithPlayOrder(G, "0", "Angland", ["0", "1", "2"]);
    callMoveWithPlayOrder(G, "1", "Gallois", ["0", "1", "2"]);
    callMoveWithPlayOrder(G, "2", "Castillia", ["0", "1", "2"]);
    // Player "0" wins with 4 votes; 3 orthodox → floor(2*3/3) = 2 VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 2);
  });
});

describe("vote — influenced kingdoms give extra votes", () => {
  it("player gains votes from kingdoms under their influence (tallied at end)", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 2 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 3 }),
    ]);
    // Player "0" has influenced prelate slot 2 (Gallois)
    G.boardState.influencePrelates[2] = "0";
    callMoveWithPlayOrder(G, "0", "Angland", ["0", "1"]);
    callMoveWithPlayOrder(G, "1", "Gallois", ["0", "1"]);
    // At tally: player "0" gets own 2 + Gallois's 3 = 5 votes for Angland
    expect(G.electionResults["Angland"]).toBe(5);
  });
});
