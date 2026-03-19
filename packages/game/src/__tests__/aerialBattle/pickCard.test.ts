/**
 * pickCard.test.ts  (aerialBattle)
 *
 * Tests for the aerialBattle pickCard move (v4.2).
 *
 * Source logic:
 *   - Reads card at G.playerInfo[playerID].resources.fortuneCards[value]
 *   - Sets battler.fowCard for the matching battler in G.battleState
 *   - Removes card from player's fortuneCards
 *   - If both battlers now have a fowCard → resolveBattleAndReturnWinner
 *   - Else → events.endTurn to the battler still missing a card
 */

import { describe, it, expect } from "vitest";
import pickCard from "../../moves/aerialBattle/pickCard";
import { buildInitialG, buildPlayer, buildCtx, buildFleet, buildResources } from "../testHelpers";

const stubEvents = { endTurn: (_args?: any) => {}, endPhase: () => {} } as any;

// ── ctx helper ─────────────────────────────────────────────────────────────────
function buildBattleCtx(playerID: string, players: string[] = ["0", "1"]) {
  return {
    ...buildCtx(playerID),
    activePlayers: null,
    turn: 1,
    phase: "battle",
    playOrder: players,
    playOrderPos: 0,
    numMoves: 0,
  };
}

// ── Map helper ─────────────────────────────────────────────────────────────────
function buildBattleMap(rows = 4, cols = 8): string[][][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => [] as string[])
  );
}

// ── Battle setup helper ───────────────────────────────────────────────────────
/**
 * Builds G with two players in a battle at [0,0].
 * Attacker ("0") has `attackerSkyships` skyships; defender ("1") has `defenderSkyships`.
 * Only the attacker has a fortuneCard (index 0) pre-loaded.
 */
function setupPickCardBattle(attackerSkyships: number, defenderSkyships: number) {
  const testCard = { name: "TestCard", sword: 0, shield: 0 };
  const G = buildInitialG([
    buildPlayer("0", {
      resources: buildResources({ fortuneCards: [testCard] as any }),
      fleetInfo: [buildFleet(0, { location: [0, 0], skyships: attackerSkyships, regiments: 0, levies: 0 })],
    }),
    buildPlayer("1", {
      resources: buildResources({ fortuneCards: [] }),
      fleetInfo: [buildFleet(0, { location: [0, 0], skyships: defenderSkyships, regiments: 0, levies: 0 })],
    }),
  ]);
  G.mapState.currentBattle = [0, 0];
  G.mapState.battleMap = buildBattleMap();
  G.mapState.battleMap[0][0] = ["0", "1"];
  G.battleState = {
    attacker: { decision: "fight", fowCard: undefined, ...G.playerInfo["0"] },
    defender: { decision: "fight", fowCard: undefined, ...G.playerInfo["1"] },
  };
  return { G, testCard };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("pickCard (aerialBattle) — card assignment", () => {
  it("assigns the selected card to the picking player's battler in battleState", () => {
    const { G, testCard } = setupPickCardBattle(3, 3);
    const ctx = buildBattleCtx("0");

    pickCard.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      0  // card index
    );

    expect(G.battleState?.attacker.fowCard).toEqual(testCard);
  });
});

describe("pickCard (aerialBattle) — hand management", () => {
  it("removes the selected card from player's fortuneCards", () => {
    const { G } = setupPickCardBattle(3, 3);
    const ctx = buildBattleCtx("0");
    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(1);

    pickCard.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      0
    );

    expect(G.playerInfo["0"].resources.fortuneCards).toHaveLength(0);
  });
});

describe("pickCard (aerialBattle) — battle resolution", () => {
  it("resolves the battle and awards +1 VP to attacker when both battlers have cards (5 vs 1 skyships)", () => {
    // Attacker: 5 skyships. Defender: 1 skyship.
    // attacker sword=5, shield=5. defender sword=1, shield=1.
    // defenderLosses = 5-1 = 4 → defender eliminated. attackerLosses = 1-5 = -4 → 0.
    // Attacker wins → +1 VP.
    const { G } = setupPickCardBattle(5, 1);
    const noEffectCard = { name: "NoEffect", sword: 0, shield: 0 };

    // Give the defender their fowCard directly so that when attacker picks, both have one
    G.battleState!.defender.fowCard = noEffectCard;

    // Also give the attacker a card in hand to pick
    G.playerInfo["0"].resources.fortuneCards = [noEffectCard] as any;

    const vpBefore = G.playerInfo["0"].resources.victoryPoints;
    const ctx = buildBattleCtx("0");

    pickCard.fn(
      { G, ctx, playerID: "0", events: stubEvents, random: {} },
      0
    );

    expect(G.playerInfo["0"].resources.victoryPoints).toBe(vpBefore + 1);
  });
});
