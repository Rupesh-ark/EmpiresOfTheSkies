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
import type { LegacyCardInfo } from "../../types";

const stubEvents = { endTurn: (_args?: any) => {}, endPhase: () => {} } as any;

function callMove(
  G: ReturnType<typeof buildInitialG>,
  playerID: string,
  card: LegacyCardInfo,
  playOrderPos: number,
  numPlayers: number
) {
  const ctx = { ...buildCtx(playerID, numPlayers), playOrderPos };
  return pickLegacyCard.fn({ G, ctx, playerID, events: stubEvents }, card);
}

// ── Card assignment ───────────────────────────────────────────────────────────

describe("pickLegacyCard — card assignment", () => {
  it("assigns the chosen card to the player's legacyCard resource", () => {
    const G = buildInitialG();
    callMove(G, "0", { name: "the builder", colour: "purple" }, 0, 2);
    expect(G.playerInfo["0"].resources.legacyCard).toEqual({ name: "the builder", colour: "purple" });
  });

  it("does not affect the other player's legacyCard", () => {
    const G = buildInitialG();
    expect(G.playerInfo["1"].resources.legacyCard).toBeUndefined();
    callMove(G, "0", { name: "the navigator", colour: "purple" }, 0, 2);
    expect(G.playerInfo["1"].resources.legacyCard).toBeUndefined();
  });

  it("two players can each pick different legacy cards", () => {
    const G = buildInitialG();
    callMove(G, "0", { name: "the builder", colour: "purple" }, 0, 2);
    callMove(G, "1", { name: "the conqueror", colour: "orange" }, 1, 2);
    expect(G.playerInfo["0"].resources.legacyCard).toEqual({ name: "the builder", colour: "purple" });
    expect(G.playerInfo["1"].resources.legacyCard).toEqual({ name: "the conqueror", colour: "orange" });
  });
});