/**
 * trainTroops.test.ts
 *
 * Tests for trainTroops (v4.2, player board action).
 *
 * Rules:
 *   - Draws 2 Fortune of War cards into the player's hand
 *   - Costs 1 counsellor
 *   - Sets playerBoardCounsellorLocations.trainTroops = true (once per round)
 *   - Marks turnComplete = true
 *   - INVALID_MOVE if: 0 counsellors, already used this round
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import trainTroops from "../../moves/actions/trainTroops";
import { buildInitialG, buildPlayer, buildCtx, buildResources, buildPlayerBoard, buildRandom } from "../testHelpers";
import { fortuneOfWarCards } from "../../codifiedGameInfo";

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string) {
  const ctx = buildCtx(playerID);
  const random = buildRandom();
  return (trainTroops as Function)({ G, ctx, playerID, random });
}

describe("trainTroops — draws 2 FoW cards", () => {
  it("adds exactly 2 FoW cards to the player's hand", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    const before = G.playerInfo["0"].resources.fortuneCards.length;
    callMove(G, "0");
    expect(G.playerInfo["0"].resources.fortuneCards.length).toBe(before + 2);
  });

  it("new cards are flipped (face-up)", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    callMove(G, "0");
    G.playerInfo["0"].resources.fortuneCards.forEach((card) => {
      expect(card.flipped).toBe(true);
    });
  });

  it("removes drawn cards from the deck", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    const deckSizeBefore = G.cardDecks.fortuneOfWarCards.length;
    callMove(G, "0");
    expect(G.cardDecks.fortuneOfWarCards.length).toBe(deckSizeBefore - 2);
  });
});

describe("trainTroops — counsellor cost", () => {
  it("consumes 1 counsellor", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    const before = G.playerInfo["0"].resources.counsellors;
    callMove(G, "0");
    expect(G.playerInfo["0"].resources.counsellors).toBe(before - 1);
  });
});

describe("trainTroops — once-per-round flag", () => {
  it("sets trainTroops flag on the player board", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    callMove(G, "0");
    expect(G.playerInfo["0"].playerBoardCounsellorLocations.trainTroops).toBe(true);
  });

  it("marks turnComplete", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    callMove(G, "0");
    expect(G.playerInfo["0"].turnComplete).toBe(true);
  });
});

describe("trainTroops — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when player has 0 counsellors", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ counsellors: 0 }) }),
    ]);
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    const result = callMove(G, "0");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player has already trained troops this round", () => {
    const G = buildInitialG([
      buildPlayer("0", { playerBoardCounsellorLocations: buildPlayerBoard({ trainTroops: true }) }),
    ]);
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    const result = callMove(G, "0");
    expect(result).toBe(INVALID_MOVE);
  });
});