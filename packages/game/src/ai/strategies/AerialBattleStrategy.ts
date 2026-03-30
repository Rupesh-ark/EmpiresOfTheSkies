import type { PhaseStrategy, AIPersonality, AIMove, ScoredAIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { calculateFleetStrength } from "../../helpers/fleetUtils";
import type { BattleContext } from "../GameRecorder";

/**
 * Aerial battle strategy: decide whether to attack, evade, or pick FoW cards
 * based on fleet strength comparison and personality aggression level.
 */
export class AerialBattleStrategy implements PhaseStrategy {
  // The most recent battle context, consumed once by the recorder after each decision.
  // Static so the browserRunner can read it without holding a bot reference in the strategy.
  private static _lastBattleContext: BattleContext | null = null;

  /** Read and clear the most recent battle context (one-shot consumption). */
  static getLastBattleContext(): BattleContext | null {
    const ctx = AerialBattleStrategy._lastBattleContext;
    AerialBattleStrategy._lastBattleContext = null;
    return ctx;
  }

  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    availableMoves?: AIMove[]
  ): ScoredAIMove {
    const moves = availableMoves ?? [];
    if (moves.length === 0) return { move: { move: "doNotAttack", args: [] }, score: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0 };

    switch (G.stage.sub) {
      case "aerial_attack_or_pass":
        return this.decideAttack(G, ctx, playerID, personality, moves);

      case "aerial_attack_or_evade":
        return this.decideEvade(G, playerID, personality, moves);

      case "conquest_draw_or_pick":
        return { move: this.pickFoWCard(G, playerID, moves), score: 0 };

      case "relocate_loser":
        return { move: this.relocate(G, playerID, moves), score: 0 };

      default:
        return { move: moves[0], score: 0 };
    }
  }

  private decideAttack(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): ScoredAIMove {
    const doNotAttack = moves.find((m) => m.move === "doNotAttack");
    const attackMoves = moves.filter((m) => m.move === "attackOtherPlayersFleet");

    if (attackMoves.length === 0) return { move: doNotAttack ?? moves[0], score: 0 };

    const myStrength = this.getFleetStrengthAtBattle(G, playerID);
    const aggression = personality.tacticalPreferences.aggressionLevel;
    // Base threshold: aggressive bots attack at 0.8x, cautious at 1.2x
    const baseThreshold = 1.2 - aggression * 0.4;

    // Gain awareness: what's at stake on this tile?
    const [bx, by] = G.mapState.currentBattle ?? [0, 0];
    const tileGain = this.estimateTileGain(G, playerID, bx, by);
    // High-value tiles lower the threshold (willing to accept more risk)
    const threshold = Math.max(0.6, baseThreshold - tileGain * 0.5);

    // Score each potential target
    let bestTarget: AIMove | null = null;
    let bestScore = -Infinity;

    for (const m of attackMoves) {
      const targetID = m.args[0] as string;
      const targetStrength = this.getFleetStrengthAtBattle(G, targetID);

      if (targetStrength === 0) {
        // Free attack — always take it
        AerialBattleStrategy._lastBattleContext = {
          myStrength,
          enemyStrength: 0,
          ratio: Infinity,
          threshold,
          fowCardCount: G.playerInfo[playerID]?.resources.fortuneCards?.length ?? 0,
          targetID: m.args[0] as string,
          decision: "attack",
        };
        return { move: m, score: 1.0 };
      }

      const ratio = myStrength / targetStrength;
      if (ratio < threshold) continue; // too risky for what's at stake

      // Score: strength advantage + target priority + tile value
      let score = ratio + tileGain * 0.3;

      // Aggressive: target the VP leader
      const allVPs = Object.values(G.playerInfo).map((p) => p.resources.victoryPoints);
      const leaderVP = Math.max(...allVPs);
      const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
      if (targetVP === leaderVP) {
        score += aggression * 0.5;
      }

      // VP gap: trailing bots are more desperate
      const myVP = G.playerInfo[playerID]?.resources.victoryPoints ?? 0;
      const vpGap = leaderVP - myVP;
      if (vpGap > 5) {
        score += Math.min(0.3, vpGap * 0.03);
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = m;
      }
    }

    const chosenTarget = bestTarget ?? doNotAttack ?? moves[0];
    const chosenScore = bestTarget ? bestScore : 0;

    // Capture battle context for the analytics recorder (consumed by browserRunner)
    const targetID = bestTarget ? (bestTarget.args[0] as string) : "";
    const targetStrengthForCtx = targetID
      ? this.getFleetStrengthAtBattle(G, targetID)
      : 0;
    AerialBattleStrategy._lastBattleContext = {
      myStrength,
      enemyStrength: targetStrengthForCtx,
      ratio: targetStrengthForCtx > 0 ? myStrength / targetStrengthForCtx : Infinity,
      threshold,
      fowCardCount: G.playerInfo[playerID]?.resources.fortuneCards?.length ?? 0,
      targetID,
      decision: bestTarget ? "attack" : "doNotAttack",
    };

    return { move: chosenTarget, score: chosenScore };
  }

  private decideEvade(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): ScoredAIMove {
    const evadeMove = moves.find((m) => m.move === "evadeAttackingFleet");
    const fightMove = moves.find((m) => m.move === "retaliate");

    if (!evadeMove) return { move: fightMove ?? moves[0], score: 0 };
    if (!fightMove) return { move: evadeMove, score: 0 };

    const myStrength = this.getFleetStrengthAtBattle(G, playerID);
    const attacker = G.battleState?.attacker;
    const attackerStrength = attacker ? this.playerStrength(attacker.fleetInfo) : 0;

    const aggression = personality.tacticalPreferences.aggressionLevel;
    // Aggressive bots fight at 0.4x ratio, cautious at 0.7x
    const baseFightThreshold = 0.7 - aggression * 0.3;

    // Gain awareness: if defending own territory, lower threshold slightly
    const [bx, by] = G.mapState.currentBattle ?? [0, 0];
    const building = G.mapState.buildings[by]?.[bx];
    const defendingOwn = building?.player?.id === playerID;
    const defenseBonus = defendingOwn ? 0.1 : 0;
    const fightThreshold = Math.max(0.5, baseFightThreshold - defenseBonus);

    const ratio = attackerStrength > 0 ? myStrength / attackerStrength : Infinity;
    const willFight = attackerStrength === 0 || ratio >= fightThreshold;
    // Score: how favourable the ratio is relative to threshold
    const score = attackerStrength === 0 ? 1.0 : Math.min(1, ratio / fightThreshold) * 0.5;

    // Capture battle context for the analytics recorder (consumed by browserRunner)
    AerialBattleStrategy._lastBattleContext = {
      myStrength,
      enemyStrength: attackerStrength,
      ratio: attackerStrength > 0 ? myStrength / attackerStrength : Infinity,
      threshold: fightThreshold,
      fowCardCount: G.playerInfo[playerID]?.resources.fortuneCards?.length ?? 0,
      targetID: attacker?.id ?? "",
      decision: willFight ? "fight" : "evade",
    };

    if (willFight) {
      return { move: fightMove, score }; // stand and fight
    }

    return { move: evadeMove, score: 0 };
  }

  private pickFoWCard(
    G: MyGameState,
    playerID: string,
    moves: AIMove[]
  ): AIMove {
    const pickMoves = moves.filter((m) => m.move === "pickCard");
    const drawMove = moves.find((m) => m.move === "drawCard");

    if (pickMoves.length === 0) return drawMove ?? moves[0];

    const hand = G.playerInfo[playerID].resources.fortuneCards;
    const isAttacker = G.battleState?.attacker?.id === playerID;

    // Pick best card: highest sword if attacking, highest shield if defending
    let bestIndex = 0;
    let bestValue = -1;

    for (const m of pickMoves) {
      const cardIdx = m.args[0] as number;
      const card = hand[cardIdx];
      if (!card) continue;
      const value = isAttacker ? card.sword : card.shield;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = pickMoves.indexOf(m);
      }
    }

    // If best hand card has 0 value, draw from deck instead (might be better)
    if (bestValue === 0 && drawMove) return drawMove;

    return pickMoves[bestIndex] ?? drawMove ?? moves[0];
  }

  private relocate(
    G: MyGameState,
    playerID: string,
    moves: AIMove[]
  ): AIMove {
    const relocateMoves = moves.filter((m) => m.move === "relocateDefeatedFleet");
    if (relocateMoves.length === 0) return moves[0];
    if (relocateMoves.length === 1) return relocateMoves[0];

    // Pick the tile closest to home [4,0] or with own buildings
    let bestMove = relocateMoves[0];
    let bestScore = -Infinity;

    for (const m of relocateMoves) {
      const dest = m.args[0] as [number, number];
      const [dx, dy] = dest;
      let score = 0;

      // Prefer tiles closer to home
      const distToHome = Math.abs(dx - 4) + Math.abs(dy - 0);
      score -= distToHome * 0.1;

      // Prefer tiles with own buildings
      const building = G.mapState.buildings[dy]?.[dx];
      if (building?.player?.id === playerID) score += 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    return bestMove;
  }

  // ── Strength helpers ──────────────────────────────────────────────────

  private getFleetStrengthAtBattle(G: MyGameState, playerID: string): number {
    const player = G.playerInfo[playerID];
    if (!player) return 0;
    const [bx, by] = G.mapState.currentBattle ?? [0, 0];
    let strength = 0;
    for (const fleet of player.fleetInfo) {
      if (fleet.location[0] === bx && fleet.location[1] === by && fleet.skyships > 0) {
        strength += calculateFleetStrength(fleet);
      }
    }
    return strength;
  }

  private playerStrength(fleetInfo: { skyships: number; regiments: number; levies: number; eliteRegiments: number }[]): number {
    let strength = 0;
    for (const fleet of fleetInfo) {
      strength += calculateFleetStrength(fleet);
    }
    return strength;
  }

  /**
   * Estimate the strategic value of the battle tile.
   * Higher value = more reason to fight (lowers attack threshold).
   * Returns 0–1 range.
   */
  private estimateTileGain(G: MyGameState, playerID: string, bx: number, by: number): number {
    let gain = 0;
    const tile = G.mapState.currentTileArray[by]?.[bx];
    const building = G.mapState.buildings[by]?.[bx];

    if (!tile) return 0;

    // Enemy building on tile — conquering it steals territory + VP
    if (building?.player && building.player.id !== playerID) {
      gain += building.buildings === "colony" ? 0.8 : 0.4;
    }

    // Unclaimed land — conquest opportunity after winning
    if (tile.type === "land" && !building?.player) {
      gain += 0.3;
      // Loot value
      const loot = tile.loot?.colony ?? tile.loot?.outpost;
      if (loot) {
        gain += Math.min(0.3, ((loot.gold ?? 0) + (loot.victoryPoints ?? 0) * 2) * 0.03);
      }
    }

    // Legend tile — plunder opportunity
    if (tile.type === "legend") {
      gain += 0.2;
    }

    // Trade route disruption — rival has buildings connected through here
    const rivalsOnTile = (G.mapState.battleMap[by]?.[bx] ?? []).filter(
      (id: string) => id !== playerID
    );
    if (rivalsOnTile.length > 0 && tile.type === "land") {
      gain += 0.15; // disrupting rival's trade/territory
    }

    return Math.min(1, gain);
  }
}
