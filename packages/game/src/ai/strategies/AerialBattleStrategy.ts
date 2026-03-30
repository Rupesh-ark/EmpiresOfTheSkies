import type { PhaseStrategy, AIPersonality, AIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../enumerate";

/**
 * Aerial battle strategy: decide whether to attack, evade, or pick FoW cards
 * based on fleet strength comparison and personality aggression level.
 */
export class AerialBattleStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality
  ): AIMove {
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) return { move: "doNotAttack", args: [] };
    if (moves.length === 1) return moves[0];

    switch (G.stage) {
      case "attack or pass":
        return this.decideAttack(G, ctx, playerID, personality, moves);

      case "attack or evade":
        return this.decideEvade(G, playerID, personality, moves);

      case "conquest draw or pick card":
        return this.pickFoWCard(G, playerID, moves);

      case "relocate loser":
        return this.relocate(G, playerID, moves);

      default:
        return moves[0];
    }
  }

  private decideAttack(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const doNotAttack = moves.find((m) => m.move === "doNotAttack");
    const attackMoves = moves.filter((m) => m.move === "attackOtherPlayersFleet");

    if (attackMoves.length === 0) return doNotAttack ?? moves[0];

    const myStrength = this.getFleetStrengthAtBattle(G, playerID);
    const aggression = personality.tacticalPreferences.aggressionLevel;
    // Aggressive bots attack at 1.2x advantage, cautious at 1.5x
    const threshold = 1.5 - aggression * 0.3;

    // Score each potential target
    let bestTarget: AIMove | null = null;
    let bestScore = -Infinity;

    for (const m of attackMoves) {
      const targetID = m.args[0] as string;
      const targetStrength = this.getFleetStrengthAtBattle(G, targetID);

      if (targetStrength === 0) {
        // Free attack — always take it
        return m;
      }

      const ratio = myStrength / targetStrength;
      if (ratio < threshold) continue; // too risky

      // Score: strength advantage + target priority
      let score = ratio;

      // Aggressive: target the VP leader
      const allVPs = Object.values(G.playerInfo).map((p) => p.resources.victoryPoints);
      const leaderVP = Math.max(...allVPs);
      const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
      if (targetVP === leaderVP) {
        score += aggression * 0.5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = m;
      }
    }

    return bestTarget ?? doNotAttack ?? moves[0];
  }

  private decideEvade(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const evadeMove = moves.find((m) => m.move === "evadeAttackingFleet");
    const fightMove = moves.find((m) => m.move === "drawCard");

    if (!evadeMove) return fightMove ?? moves[0];
    if (!fightMove) return evadeMove;

    const myStrength = this.getFleetStrengthAtBattle(G, playerID);
    const attacker = G.battleState?.attacker;
    const attackerStrength = attacker ? this.playerStrength(attacker) : 0;

    const aggression = personality.tacticalPreferences.aggressionLevel;
    // Aggressive bots fight at 0.6x ratio, cautious at 0.8x
    const fightThreshold = 0.8 - aggression * 0.2;

    if (attackerStrength === 0 || myStrength / attackerStrength >= fightThreshold) {
      return fightMove; // stand and fight
    }

    return evadeMove;
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
        strength += fleet.skyships * 1.5 + fleet.regiments + fleet.levies * 0.5 + fleet.eliteRegiments * 1.5;
      }
    }
    return strength;
  }

  private playerStrength(player: { resources: { skyships: number; regiments: number; levies: number; eliteRegiments: number }; fleetInfo: { skyships: number; regiments: number; levies: number; eliteRegiments: number; location: number[] }[] }): number {
    let strength = 0;
    for (const fleet of player.fleetInfo) {
      strength += fleet.skyships * 1.5 + fleet.regiments + fleet.levies * 0.5 + fleet.eliteRegiments * 1.5;
    }
    return strength;
  }
}
