/**
 * pickKingdomAdvantageCard.test.ts
 *
 * Tests for pickKingdomAdvantageCard (v4.2).
 *
 * Rules:
 *   - Player picks one card from the kingdomAdvantagePool
 *   - Card is removed from the pool and assigned to the player
 *   - elite_regiments: converts 3 regiments → 3 elite regiments
 *   - INVALID_MOVE if: card not in pool, player already has a card
 */

import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import pickKingdomAdvantageCard from "../../moves/kingdomAdvantage/pickKingdomAdvantageCard";
import { buildInitialG, buildPlayer, buildCtx, buildResources } from "../testHelpers";
import type { KingdomAdvantageCard } from "../../types";

const stubEvents = { endTurn: () => {}, endPhase: () => {} } as any;

function callMove(G: ReturnType<typeof buildInitialG>, playerID: string, card: KingdomAdvantageCard) {
  const ctx = buildCtx(playerID);
  return pickKingdomAdvantageCard.fn({ G, ctx, playerID, events: stubEvents }, card);
}

describe("pickKingdomAdvantageCard — card assignment", () => {
  it("assigns the chosen card to the player", () => {
    const G = buildInitialG();
    G.cardDecks.kingdomAdvantagePool = ["improved_training", "licenced_smugglers"];
    callMove(G, "0", "improved_training");
    expect(G.playerInfo["0"].resources.advantageCard).toBe("improved_training");
  });

  it("removes the card from the pool after picking", () => {
    const G = buildInitialG();
    G.cardDecks.kingdomAdvantagePool = ["improved_training", "licenced_smugglers"];
    callMove(G, "0", "improved_training");
    expect(G.cardDecks.kingdomAdvantagePool).not.toContain("improved_training");
    expect(G.cardDecks.kingdomAdvantagePool).toContain("licenced_smugglers");
  });
});

describe("pickKingdomAdvantageCard — elite_regiments conversion", () => {
  it("converts 3 regiments to 3 elite regiments when picking elite_regiments", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6, eliteRegiments: 0 }) }),
    ]);
    G.cardDecks.kingdomAdvantagePool = ["elite_regiments"];
    callMove(G, "0", "elite_regiments");
    expect(G.playerInfo["0"].resources.regiments).toBe(3); // 6 - 3
    expect(G.playerInfo["0"].resources.eliteRegiments).toBe(3);
  });

  it("does NOT modify regiments for non-elite cards", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ regiments: 6, eliteRegiments: 0 }) }),
    ]);
    G.cardDecks.kingdomAdvantagePool = ["improved_training"];
    callMove(G, "0", "improved_training");
    expect(G.playerInfo["0"].resources.regiments).toBe(6); // unchanged
    expect(G.playerInfo["0"].resources.eliteRegiments).toBe(0); // unchanged
  });
});

describe("pickKingdomAdvantageCard — INVALID_MOVE conditions", () => {
  it("returns INVALID_MOVE when card is not in the pool", () => {
    const G = buildInitialG();
    G.cardDecks.kingdomAdvantagePool = ["improved_training"];
    const result = callMove(G, "0", "licenced_smugglers");
    expect(result).toBe(INVALID_MOVE);
  });

  it("returns INVALID_MOVE when player already has an advantage card", () => {
    const G = buildInitialG([
      buildPlayer("0", { resources: buildResources({ advantageCard: "improved_training" }) }),
    ]);
    G.cardDecks.kingdomAdvantagePool = ["licenced_smugglers"];
    const result = callMove(G, "0", "licenced_smugglers");
    expect(result).toBe(INVALID_MOVE);
  });
});