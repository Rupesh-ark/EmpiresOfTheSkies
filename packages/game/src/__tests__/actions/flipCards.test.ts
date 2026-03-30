/**
 * flipCards.test.ts
 *
 * Tests for the flipCards move.
 *
 * Source logic:
 *   - Sets card.flipped = true on every card in the player's fortuneCards hand
 */

import { describe, it, expect } from "vitest";
import flipCards from "../../moves/actions/flipCards";
import { buildInitialG, buildPlayer, buildResources, buildCtx } from "../testHelpers";

describe("flipCards — card flipping", () => {
  it("sets flipped=true on all cards in the player's hand", () => {
    const cards = [
      { name: "Sword1", sword: 1, shield: 0, flipped: false },
      { name: "Shield1", sword: 0, shield: 1, flipped: false },
    ] as any;
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ fortuneCards: cards }) }),
    ]);
    const ctx = buildCtx("0");

    (flipCards as Function)({ G, playerID: "0", ctx });

    expect(G.playerInfo["0"].resources.fortuneCards[0].flipped).toBe(true);
    expect(G.playerInfo["0"].resources.fortuneCards[1].flipped).toBe(true);
  });

  it("does not affect other players' cards", () => {
    const p0Cards = [{ name: "Sword1", sword: 1, shield: 0, flipped: false }] as any;
    const p1Cards = [{ name: "Shield1", sword: 0, shield: 1, flipped: false }] as any;
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ fortuneCards: p0Cards }) }),
      buildPlayer("1", { resources: buildResources({ fortuneCards: p1Cards }) }),
    ]);
    const ctx = buildCtx("0");

    (flipCards as Function)({ G, playerID: "0", ctx });

    expect(G.playerInfo["1"].resources.fortuneCards[0].flipped).toBe(false);
  });

  it("is a no-op when the player has no cards", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ fortuneCards: [] }) }),
    ]);
    const ctx = buildCtx("0");

    expect(() => {
      (flipCards as Function)({ G, playerID: "0", ctx });
    }).not.toThrow();
    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(0);
  });
});
