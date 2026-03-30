/**
 * vote.test.ts
 *
 * Tests for the vote move (v4.2, election phase).
 *
 * Rules:
 *   - Each player casts votes for a kingdom
 *   - Votes come from: own cathedrals (if own kingdom is not under enemy influence)
 *     plus cathedrals of any kingdom under their influence, plus +1 for Zeeland/Venoa
 *   - After all players vote, the kingdom with most votes becomes Archprelate
 *   - On tie: the current Archprelate retains the title
 *   - New Archprelate gains floor(orthodoxKingdoms/3) VP
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
  return (vote as Function)({ G, ctx, playerID, events: stubEvents, random: {} }, kingdomVotedFor);
}

describe("vote — vote counting", () => {
  it("adds the player's cathedral count to the voted kingdom's total", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 3 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1 }),
    ]);
    callMove(G, "0", "Angland");
    expect(G.electionResults["Angland"]).toBe(3);
  });

  it("adds player to hasVoted after voting", () => {
    const G = buildInitialG();
    callMove(G, "0", "Angland");
    expect(G.hasVoted).toContain("0");
  });

  it("accumulates votes across multiple players voting for the same kingdom", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 2 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 3 }),
    ]);
    callMove(G, "0", "Angland");
    callMove(G, "1", "Angland");
    expect(G.electionResults["Angland"]).toBe(5); // 2 + 3
  });
});

describe("vote — Archprelate assignment (all players voted)", () => {
  it("assigns isArchprelate to the kingdom with the most votes", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 4 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1 }),
    ]);
    callMove(G, "0", "Angland");
    callMove(G, "1", "Gallois");
    // Player "0" voted for Angland with 4 votes, player "1" voted for Gallois with 1 vote
    expect(G.playerInfo["0"].isArchprelate).toBe(true);
    expect(G.playerInfo["1"].isArchprelate).toBe(false);
  });

  it("on tie: current Archprelate retains title", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 2, isArchprelate: true }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 2, isArchprelate: false }),
    ]);
    callMove(G, "0", "Angland");
    callMove(G, "1", "Gallois");
    // Tied at 2–2: current Archprelate (player "0") keeps title
    expect(G.playerInfo["0"].isArchprelate).toBe(true);
    expect(G.playerInfo["1"].isArchprelate).toBe(false);
  });

  it("new Archprelate gains floor(orthodoxCount/3) VP", () => {
    // 3 orthodox players → floor(3/3) = 1 VP bonus
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 4, hereticOrOrthodox: "orthodox" }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 1, hereticOrOrthodox: "orthodox" }),
      buildPlayer("2", { kingdomName: "Castillia", cathedrals: 1, hereticOrOrthodox: "orthodox" }),
    ]);
    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    callMove(G, "0", "Angland");
    callMove(G, "1", "Gallois");
    callMove(G, "2", "Castillia");
    // Player "0" wins with 4 votes; 3 orthodox → floor(2*3/3)=2 VP
    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 2);
  });
});

describe("vote — influenced kingdoms give extra votes", () => {
  it("player gains votes from kingdoms under their influence", () => {
    const G = buildInitialG([
      buildPlayer("0", { kingdomName: "Angland", cathedrals: 2 }),
      buildPlayer("1", { kingdomName: "Gallois", cathedrals: 3 }),
    ]);
    // Player "0" has influenced prelate slot 2 (Gallois)
    G.boardState.influencePrelates[2] = "0";
    callMove(G, "0", "Angland");
    // Player "0" gets their own 2 cathedrals + Gallois's 3 cathedrals = 5
    expect(G.electionResults["Angland"]).toBe(5);
  });
});