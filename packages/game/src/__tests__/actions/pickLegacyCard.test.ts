/**
 * pickLegacyCard.test.ts
 *
 * Tests for pickLegacyCard move (v4.2).
 *
 * Rules:
 *   - Assigns the chosen card to the player's resources.legacyCard
 *   - If the player is the last in play order (playOrderPos === numPlayers - 1),
 *     calls events.endPhase(); otherwise calls events.endTurn()
 *   - Does not affect other players' legacyCard
 */

import { describe, it, expect } from "vitest";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";
import pickLegacyCard from "../../moves/pickLegacyCard";
import type { LegacyCard } from "../../types";

const stubEvents = { endTurn: (_args?: any) => {}, endPhase: () => {} } as any;

function callMove(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  card: LegacyCard,
  playOrderPos: number,
  numPlayers: number
) {
  const ctx = { ...buildCtx(playerID, numPlayers), playOrderPos };
  return (pickLegacyCard as Function)({ G, ctx, playerID, events: stubEvents }, card);
}

// ── Card assignment ───────────────────────────────────────────────────────────

describe("pickLegacyCard — card assignment", () => {
  it("assigns the chosen card to the player's legacyCard resource", () => {
    const G = buildInitialG();
    callMove(G, "0", "the builder", 0, 2);
    expect(G.playerInfo["0"].resources.legacyCard).toBe("the builder");
  });

  it("does not affect the other player's legacyCard", () => {
    const G = buildInitialG();
    // Player "1" has no legacy card initially
    expect(G.playerInfo["1"].resources.legacyCard).toBeUndefined();
    callMove(G, "0", "the navigator", 0, 2);
    // Player "1" should remain unaffected
    expect(G.playerInfo["1"].resources.legacyCard).toBeUndefined();
  });

  it("two players can each pick different legacy cards", () => {
    const G = buildInitialG();
    callMove(G, "0", "the builder", 0, 2);
    callMove(G, "1", "the conqueror", 1, 2);
    expect(G.playerInfo["0"].resources.legacyCard).toBe("the builder");
    expect(G.playerInfo["1"].resources.legacyCard).toBe("the conqueror");
  });
});