/**
 * punishDissenters.test.ts
 *
 * Tests for punishDissenters (v4.2, B6).
 *
 * Rules:
 *   - Cost: 2 Gold OR 1 extra counsellor (player's choice) + 1 counsellor placed on board
 *   - Always: +1 prisoner to the player
 *   - Orthodox player: heresyTracker moves toward orthodoxy (-1)
 *   - Heretic player: heresyTracker moves toward heresy (+1)
 *   - Cannot exceed 3 prisoners
 *   - Can only do this action once per round (checked via alreadyPunishing)
 *   - INVALID_MOVE if: slot taken, slot > numPlayers, already punishing, prisoners >= 3,
 *     gold < 2 (when paying gold), counsellors < 2 (when paying counsellor)
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import punishDissenters from "../../moves/actions/punishDissenters";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";

function callMove(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  slotIndex: number,
  paymentType: "gold" | "counsellor",
  numPlayers = 2
) {
  const ctx = buildCtx(playerID, numPlayers);
  return (punishDissenters as Function)({ G, ctx, playerID }, slotIndex, paymentType);
}

describe("punishDissenters — costs", () => {
  it("gold payment: costs 2 Gold and 1 counsellor (placed on board)", () => {
    const G = buildInitialG();
    const goldBefore = G.playerInfo["0"].resources.gold;
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 0, "gold");
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore - 2);
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore - 1);
  });

  it("counsellor payment: costs 2 counsellors (1 extra + 1 placed) and no gold", () => {
    const G = buildInitialG();
    const goldBefore = G.playerInfo["0"].resources.gold;
    const counsellorsBefore = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0", 0, "counsellor");
    expect(G.playerInfo["0"].resources.gold).toBe(goldBefore);
    expect(G.playerInfo["0"].resources.counsellors).toBe(counsellorsBefore - 2);
  });
});

describe("punishDissenters — prisoner gain", () => {
  it("adds 1 prisoner", () => {
    const G = buildInitialG();
    const before = G.playerInfo["0"].prisoners;
    callMove(G, "0", 0, "gold");
    expect(G.playerInfo["0"].prisoners).toBe(before + 1);
  });
});

describe("punishDissenters — heresy track effects", () => {
  it("orthodox player's heresyTracker decreases by 1 (toward orthodoxy)", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "orthodox", heresyTracker: 9 })]);
    callMove(G, "0", 0, "gold");
    expect(G.playerInfo["0"].heresyTracker).toBe(8);
  });

  it("heretic player's heresyTracker increases by 1 (toward heresy)", () => {
    const G = buildInitialG([buildPlayer("0", { hereticOrOrthodox: "heretic", heresyTracker: 9 })]);
    callMove(G, "0", 0, "gold");
    expect(G.playerInfo["0"].heresyTracker).toBe(10);
  });
});

describe("punishDissenters — board state", () => {
  it("records the player in the chosen slot", () => {
    const G = buildInitialG();
    callMove(G, "0", 0, "gold");
    expect(G.boardState.punishDissenters[1]).toBe("0");
  });

  it("marks turnComplete", () => {
    const G = buildInitialG();
    callMove(G, "0", 0, "gold");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("punishDissenters — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when slot is already taken", () => {
    const G = buildInitialG();
    G.boardState.punishDissenters[1] = "1";
    const result = callMove(G, "0", 0, "gold");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when slot > numPlayers", () => {
    const G = buildInitialG();
    const result = callMove(G, "0", 2, "gold", 2); // slot 3 > 2 players
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player already used this action", () => {
    const G = buildInitialG();
    G.boardState.punishDissenters[1] = "0"; // player already placed
    const result = callMove(G, "0", 1, "gold");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when prisoners >= 3", () => {
    const G = buildInitialG([buildPlayer("0", { prisoners: 3 })]);
    const result = callMove(G, "0", 0, "gold");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when paying gold with < 2 Gold", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ gold: 1 }) }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0", 0, "gold");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when paying counsellor with < 2 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 1 }) }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0", 0, "counsellor");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when paymentType is invalid", () => {
    const G = buildInitialG();
    const result = callMove(G, "0", 0, "invalid" as any);
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 0 }) }),
      buildPlayer("1"),
    ]);
    const result = callMove(G, "0", 0, "gold");
    expect(result).toBe(INVALID_MOVE);
  });
});
