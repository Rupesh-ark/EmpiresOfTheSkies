/**
 * influencePrelates.test.ts
 *
 * Tests for influencePrelates (v4.2).
 *
 * Rules:
 *   - Player pays Gold equal to the number of cathedrals owned by the target kingdom's ruler
 *   - If the target slot has a matching colour player, that player RECEIVES the gold
 *   - If no player matches that colour slot (neutral/neutral kingdom), no one gets the gold
 *   - Costs 1 counsellor
 *   - Marks turnComplete = true
 *   - INVALID_MOVE if: 0 counsellors, slot already taken
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import influencePrelates from "../../moves/actions/influencePrelates";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";
import { PlayerColour } from "../../types";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, slotIndex: number) {
  const ctx = buildCtx(playerID);
  return influencePrelates.fn({ G, ctx, playerID }, slotIndex);
}

describe("influencePrelates — gold cost = target cathedral count", () => {
  it("costs 1 Gold when slot is neutral (no matching kingdom player — code defaults cost to 1)", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 6 }) }),
    ]);
    // Slot index 3 → slot 4 → kingdomToIDMap[4] = null → no player match → cost stays at default 1
    const goldBefore = G.playerInfo["0"].resources.gold;
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 1);
  });

  it("player pays gold equal to the target's cathedral count", () => {
    // Slot index 0 → slot 1 → PlayerColour.red → Angland player
    const G = buildInitialG([
      buildPlayer("0", { colour: PlayerColour.blue, resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { colour: PlayerColour.red, cathedrals: 3 }),
    ]);
    const goldBefore = G.playerInfo["0"].resources.gold;
    callMove(G, "0", 0); // slot 1 = red kingdom player = player "1" with 3 cathedrals
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 3);
  });

  it("target player receives the gold payment", () => {
    const G = buildInitialG([
      buildPlayer("0", { colour: PlayerColour.blue, resources: buildResources({ gold: 10 }) }),
      buildPlayer("1", { colour: PlayerColour.red, cathedrals: 2 }),
    ]);
    const goldBefore = G.playerInfo["1"].resources.gold;
    callMove(G, "0", 0); // slot 1 = red → player "1"
    expect(G.playerInfo["1"].resources.gold).toBe(goldBefore + 2);
  });
});

describe("influencePrelates — counsellor cost", () => {
  it("consumes 1 counsellor", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 3); // neutral slot — cost 0 gold
    expect(G.playerInfo["0"].resources.counsellors).toBe(before - 1);
  });
});

describe("influencePrelates — board state", () => {
  it("records the player in the slot", () => {
    const G = buildInitialG();
    callMove(G, "0", 3);
    expect(G.boardState.influencePrelates[4]).toBe("0");
  });

  it("marks turnComplete", () => {
    const G = buildInitialG();
    callMove(G, "0", 3);
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("influencePrelates — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 0 }) }),
    ]);
    const result = callMove(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when slot is already taken", () => {
    const G = buildInitialG();
    G.boardState.influencePrelates[4] = "1";
    const result = callMove(G, "0", 3);
    expect(result).toBe(INVALID_MOVE);
  });
});