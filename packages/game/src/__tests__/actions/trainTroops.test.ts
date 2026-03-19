/**
 * trainTroops.test.ts
 *
 * Tests for trainTroops (v4.2, player board action).
 *
 * Rules:
 *   - Costs 1 counsellor
 *   - Sets playerBoardCounsellorLocations.trainTroops = true (once per round)
 *   - Sets G.stage = "confirm_fow_draw" (does NOT mark turnComplete)
 *   - Does NOT draw FoW cards — card draw happens via the drawFoWCards move
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
  return trainTroops.fn({ G, ctx, playerID, random });
}

describe("trainTroops — no card draw (deferred to confirmAction)", () => {
  it("does NOT draw FoW cards immediately", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    const before = G.playerInfo["0"].resources.fortuneCards.length;
    callMove(G, "0");
    expect(G.playerInfo["0"].resources.fortuneCards.length).toBe(before);
  });

  it("does NOT remove cards from the deck", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    const deckSizeBefore = G.cardDecks.fortuneOfWarCards.length;
    callMove(G, "0");
    expect(G.cardDecks.fortuneOfWarCards.length).toBe(deckSizeBefore);
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

  it("sets stage to confirm_fow_draw instead of marking turnComplete", () => {
    const G = buildInitialG();
    G.cardDecks.fortuneOfWarCards = [...fortuneOfWarCards];
    callMove(G, "0");
    expect(G.stage).toBe("confirm_fow_draw");
    expect(G.playerInfo["0"].turnComplete).toBe(false);
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