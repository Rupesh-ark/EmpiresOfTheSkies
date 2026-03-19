/**
 * setup.test.ts
 *
 * Verifies the v4.2 game setup constants:
 *   - Fortune of War deck composition (32 cards, swords 1–5, shields 4–8, NoEffect)
 *   - STARTING_RESOURCES values
 *   - MAX_* enforcement constants
 */

import { describe, it, expect } from "vitest";
import { fortuneOfWarCards, STARTING_RESOURCES, MAX_COUNSELLORS, MAX_FACTORIES, MAX_HERESY, MAX_LEVIES } from "../codifiedGameInfo";

// ── Fortune of War deck ───────────────────────────────────────────────────────

describe("Fortune of War deck (v4.2)", () => {
  it("contains exactly 32 cards", () => {
    expect(fortuneOfWarCards).toHaveLength(32);
  });

  it("contains 3 copies of each sword value 1–5 (15 sword cards)", () => {
    for (let value = 1; value <= 5; value++) {
      const swordCards = fortuneOfWarCards.filter((c) => c.sword === value && c.shield === 0);
      expect(swordCards).toHaveLength(3);
    }
  });

  it("contains 3 copies of each shield value 4–8 (15 shield cards)", () => {
    for (let value = 4; value <= 8; value++) {
      const shieldCards = fortuneOfWarCards.filter((c) => c.shield === value && c.sword === 0);
      expect(shieldCards).toHaveLength(3);
    }
  });

  it("contains exactly 2 NoEffect cards", () => {
    const noEffectCards = fortuneOfWarCards.filter((c) => c.sword === 0 && c.shield === 0);
    expect(noEffectCards).toHaveLength(2);
  });

  it("has no shield values outside 4–8", () => {
    const invalidShields = fortuneOfWarCards.filter((c) => c.shield > 0 && (c.shield < 4 || c.shield > 8));
    expect(invalidShields).toHaveLength(0);
  });

  it("has no sword values outside 1–5", () => {
    const invalidSwords = fortuneOfWarCards.filter((c) => c.sword > 5 || c.sword < 0);
    expect(invalidSwords).toHaveLength(0);
  });

  it("every card has either a sword value, a shield value, or is NoEffect — never both", () => {
    for (const card of fortuneOfWarCards) {
      const hasSword = card.sword > 0;
      const hasShield = card.shield > 0;
      expect(hasSword && hasShield).toBe(false);
    }
  });
});

// ── Starting resources ────────────────────────────────────────────────────────

describe("STARTING_RESOURCES (v4.2)", () => {
  it("starts with 6 gold", () => {
    expect(STARTING_RESOURCES.gold).toBe(6);
  });

  it("starts with 4 counsellors (not 6 from v3.6)", () => {
    expect(STARTING_RESOURCES.counsellors).toBe(4);
  });

  it("starts with 3 skyships", () => {
    expect(STARTING_RESOURCES.skyships).toBe(3);
  });

  it("starts with 6 regiments", () => {
    expect(STARTING_RESOURCES.regiments).toBe(6);
  });

  it("starts with 0 levies", () => {
    expect(STARTING_RESOURCES.levies).toBe(0);
  });

  it("starts with 1 factory", () => {
    expect(STARTING_RESOURCES.factories).toBe(1);
  });

  it("starts with 10 victory points", () => {
    expect(STARTING_RESOURCES.victoryPoints).toBe(10);
  });
});

// ── Maximum enforcement constants ─────────────────────────────────────────────

describe("MAX constants (v4.2)", () => {
  it("MAX_COUNSELLORS is 7", () => {
    expect(MAX_COUNSELLORS).toBe(7);
  });

  it("MAX_FACTORIES is 6", () => {
    expect(MAX_FACTORIES).toBe(6);
  });

  it("MAX_HERESY is 19", () => {
    expect(MAX_HERESY).toBe(19);
  });

  it("MAX_LEVIES is 12", () => {
    expect(MAX_LEVIES).toBe(12);
  });
});