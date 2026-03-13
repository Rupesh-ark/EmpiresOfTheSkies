/**
 * issueHolyDecree.test.ts
 *
 * Tests for issueHolyDecree (v4.2).
 *
 * Rules:
 *   - Only the Archprelate can issue a holy decree
 *   - Can only be used once per election cycle (boardState.issueHolyDecree flag)
 *   - Decree options:
 *       "reform dogma"  → all heresyTrackers move toward orthodoxy (−1)
 *       "confirm dogma" → all heresyTrackers move toward heresy (+1)
 *       "bless monarch" → target player gains VP (amount = blessingOrCurseVPAmount)
 *       "curse monarch" → target player loses VP (amount = blessingOrCurseVPAmount)
 *   - Marks issueHolyDecree board flag = true
 *   - Marks turnComplete = true
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import issueHolyDecree from "../../moves/actions/issueHolyDecree";
import { buildInitialG, buildPlayer, buildCtx } from "../testHelpers";

function callMove(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  decree: string,
  targetID?: string
) {
  const ctx = buildCtx(playerID);
  return (issueHolyDecree as Function)({ G, ctx, playerID }, decree, targetID);
}

describe("issueHolyDecree — reform dogma", () => {
  it("retreats all heresyTrackers by 1", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, heresyTracker: 9 }),
      buildPlayer("1", { heresyTracker: 5 }),
    ]);
    callMove(G, "0", "reform dogma");
    expect(G.playerInfo["0"].heresyTracker).toBe(8);
    expect(G.playerInfo["1"].heresyTracker).toBe(4);
  });
});

describe("issueHolyDecree — confirm dogma", () => {
  it("advances all heresyTrackers by 1", () => {
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, heresyTracker: 9 }),
      buildPlayer("1", { heresyTracker: 5 }),
    ]);
    callMove(G, "0", "confirm dogma");
    expect(G.playerInfo["0"].heresyTracker).toBe(10);
    expect(G.playerInfo["1"].heresyTracker).toBe(6);
  });
});

describe("issueHolyDecree — bless monarch", () => {
  it("adds VP to the target player — amount = floor(orthodoxCount / 3), so need 3+ orthodox", () => {
    // blessingOrCurseVPAmount = floor(orthodoxPlayerCount / 3)
    // With 3 orthodox players → floor(3/3) = 1 VP
    // GAP-19: bless targets the least-advanced orthodox (lowest heresyTracker)
    // Give player "1" a lower tracker so they are the valid target
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox", heresyTracker: 5 }),
      buildPlayer("1", { hereticOrOrthodox: "orthodox", heresyTracker: 0 }),
      buildPlayer("2", { hereticOrOrthodox: "orthodox", heresyTracker: 5 }),
    ]);
    const vpBefore = G.playerInfo["1"].resources.victoryPoints;
    callMove(G, "0", "bless monarch", "1");
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(vpBefore + 1);
  });
});

describe("issueHolyDecree — curse monarch", () => {
  it("removes VP from the target player — amount = floor(orthodoxCount / 3)", () => {
    // GAP-19: curse targets the most heresy-advanced orthodox (highest heresyTracker) when no heretics
    // Give player "1" a higher tracker so they are the valid target
    const G = buildInitialG([
      buildPlayer("0", { isArchprelate: true, hereticOrOrthodox: "orthodox", heresyTracker: 0 }),
      buildPlayer("1", { hereticOrOrthodox: "orthodox", heresyTracker: 10 }),
      buildPlayer("2", { hereticOrOrthodox: "orthodox", heresyTracker: 0 }),
    ]);
    const vpBefore = G.playerInfo["1"].resources.victoryPoints;
    callMove(G, "0", "curse monarch", "1");
    expect(G.playerInfo["1"].resources.victoryPoints).toBe(vpBefore - 1);
  });
});

describe("issueHolyDecree — board state", () => {
  it("sets issueHolyDecree board flag to true", () => {
    const G = buildInitialG([buildPlayer("0", { isArchprelate: true })]);
    callMove(G, "0", "reform dogma");
    expect(G.boardState.issueHolyDecree).toBe(true);
  });

  it("marks turnComplete", () => {
    const G = buildInitialG([buildPlayer("0", { isArchprelate: true })]);
    callMove(G, "0", "reform dogma");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("issueHolyDecree — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player is not the Archprelate", () => {
    const G = buildInitialG([buildPlayer("0", { isArchprelate: false })]);
    const result = callMove(G, "0", "reform dogma");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when decree has already been issued this election cycle", () => {
    const G = buildInitialG([buildPlayer("0", { isArchprelate: true })]);
    G.boardState.issueHolyDecree = true; // already used
    const result = callMove(G, "0", "reform dogma");
    expect(result).toBe(INVALID_MOVE);
  });
});
