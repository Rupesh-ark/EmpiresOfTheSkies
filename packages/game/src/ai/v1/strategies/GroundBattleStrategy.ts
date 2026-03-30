/** @deprecated v1 scoring system — kept for non-actions phases. See ../../evaluators/ for v2. */
import type { PhaseStrategy, AIPersonality, AIMove, ScoredAIMove } from "../../types";
import type { MyGameState } from "../../../types";
import type { Ctx } from "boardgame.io";
import type { BattleContext } from "../../GameRecorder";

/**
 * Ground battle strategy: decide whether to attack buildings,
 * defend or yield, and how many troops to garrison.
 */
export class GroundBattleStrategy implements PhaseStrategy {
  // The most recent ground battle context, consumed once by the recorder after each decision.
  private static _lastBattleContext: BattleContext | null = null;

  /** Read and clear the most recent battle context (one-shot consumption). */
  static getLastBattleContext(): BattleContext | null {
    const ctx = GroundBattleStrategy._lastBattleContext;
    GroundBattleStrategy._lastBattleContext = null;
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
    if (moves.length === 0) return { move: { move: "doNotGroundAttack", args: [] }, score: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0 };

    switch (G.stage.sub) {
      case "ground_attack_or_pass":
        return { move: this.decideGroundAttack(G, playerID, personality, moves), score: 0 };

      case "ground_defend_or_yield":
        return { move: this.decideDefend(G, playerID, personality, moves), score: 0 };

      case "ground_garrison":
        return { move: this.decideGarrison(G, playerID, personality, moves), score: 0 };

      case "conquest_draw_or_pick":
        return { move: this.pickFoWCard(G, playerID, moves), score: 0 };

      default:
        return { move: moves[0], score: 0 };
    }
  }

  private decideGroundAttack(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const dontAttack = moves.find((m) => m.move === "doNotGroundAttack");
    const attackMoves = moves.filter((m) => m.move === "attackPlayersBuilding");

    if (attackMoves.length === 0) return dontAttack ?? moves[0];

    const [bx, by] = G.mapState.currentBattle ?? [0, 0];
    const myTroops = this.getTroopsAtTile(G, playerID, bx, by);
    const aggression = personality.tacticalPreferences.aggressionLevel;
    const threshold = 1.5 - aggression * 0.3;

    let bestTarget: AIMove | null = null;
    let bestScore = -Infinity;
    let bestDefenseStrength = 0;

    for (const m of attackMoves) {
      const targetID = m.args[0] as string;
      const building = G.mapState.buildings[by]?.[bx];
      const garrisonStrength =
        (building?.garrisonedRegiments ?? 0) +
        (building?.garrisonedLevies ?? 0) * 0.5 +
        (building?.garrisonedEliteRegiments ?? 0) * 1.5;
      const hasFort = (building?.fort?.length ?? 0) > 0 ? 2 : 0;

      const defenseStrength = garrisonStrength + hasFort;
      if (defenseStrength === 0) {
        GroundBattleStrategy._lastBattleContext = {
          myStrength: myTroops,
          enemyStrength: 0,
          ratio: Infinity,
          threshold,
          fowCardCount: G.playerInfo[playerID]?.resources.fortuneCards?.length ?? 0,
          targetID,
          decision: "attack",
        };
        return m;
      }

      const ratio = myTroops / defenseStrength;
      if (ratio < threshold) continue;

      let score = ratio;
      const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
      const allVPs = Object.values(G.playerInfo).map((p) => p.resources.victoryPoints);
      const leaderVP = Math.max(...allVPs);
      if (targetVP === leaderVP) score += aggression * 0.3;

      if (building?.buildings === "colony") score += 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = m;
        bestDefenseStrength = defenseStrength;
      }
    }

    const chosenTargetID = bestTarget ? (bestTarget.args[0] as string) : "";
    GroundBattleStrategy._lastBattleContext = {
      myStrength: myTroops,
      enemyStrength: bestDefenseStrength,
      ratio: bestDefenseStrength > 0 ? myTroops / bestDefenseStrength : Infinity,
      threshold,
      fowCardCount: G.playerInfo[playerID]?.resources.fortuneCards?.length ?? 0,
      targetID: chosenTargetID,
      decision: bestTarget ? "attack" : "doNotAttack",
    };

    return bestTarget ?? dontAttack ?? moves[0];
  }

  private decideDefend(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const defendMove = moves.find((m) => m.move === "defendGroundAttack");
    const yieldMove = moves.find((m) => m.move === "yieldToAttacker");

    if (!defendMove) return yieldMove ?? moves[0];
    if (!yieldMove) return defendMove;

    const [bx, by] = G.mapState.currentBattle ?? [0, 0];
    const building = G.mapState.buildings[by]?.[bx];

    const garrisonStrength =
      (building?.garrisonedRegiments ?? 0) +
      (building?.garrisonedLevies ?? 0) * 0.5 +
      (building?.garrisonedEliteRegiments ?? 0) * 1.5;
    const fortBonus = (building?.fort?.length ?? 0) > 0 ? 2 : 0;
    const defenseTotal = garrisonStrength + fortBonus;

    const attacker = G.battleState?.attacker;
    const attackerID = attacker?.id;
    const attackerTroops = attackerID ? this.getTroopsAtTile(G, attackerID, bx, by) : 0;

    const aggression = personality.tacticalPreferences.aggressionLevel;

    const isColony = building?.buildings === "colony";
    const buildingValue = isColony ? 0.8 : 0.4;

    const defenceThreshold = 0.5;
    const ratio = defenseTotal / (attackerTroops || 1);

    const willFight =
      (defenseTotal > 0 && (ratio >= defenceThreshold || buildingValue > 0.6)) ||
      (aggression > 0.6 && defenseTotal > 0);

    GroundBattleStrategy._lastBattleContext = {
      myStrength: defenseTotal,
      enemyStrength: attackerTroops,
      ratio,
      threshold: defenceThreshold,
      fowCardCount: G.playerInfo[playerID]?.resources.fortuneCards?.length ?? 0,
      targetID: attackerID ?? "",
      decision: willFight ? "fight" : "evade",
    };

    if (willFight) {
      return defendMove;
    }

    return yieldMove;
  }

  private decideGarrison(
    G: MyGameState,
    playerID: string,
    personality: AIPersonality,
    moves: AIMove[]
  ): AIMove {
    const garrisonMoves = moves.filter((m) => m.move === "garrisonTroops");
    if (garrisonMoves.length === 0) return moves[0];

    const available = G.troopsAvailableForGarrison;

    if (!available ||
        typeof available.levies !== 'number' || isNaN(available.levies) ||
        typeof available.regiments !== 'number' || isNaN(available.regiments) ||
        typeof available.elites !== 'number' || isNaN(available.elites)) {
      console.warn(`[GroundBattleStrategy] Invalid troopsAvailableForGarrison: ${JSON.stringify(available)}`);
      return garrisonMoves[0];
    }

    const aggression = personality.tacticalPreferences.aggressionLevel;
    const garrisonFraction = 0.5 + aggression * 0.5;

    const regs = Math.ceil(available.regiments * garrisonFraction);
    const levies = Math.ceil(available.levies * garrisonFraction);
    const elites = Math.ceil(available.elites * garrisonFraction);

    if (regs + levies + elites > 0) {
      return { move: "garrisonTroops", args: [[regs, levies, elites]] };
    }

    return garrisonMoves[0];
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

    let bestIdx = 0;
    let bestValue = -1;

    for (const m of pickMoves) {
      const cardIdx = m.args[0] as number;
      const card = hand[cardIdx];
      if (!card) continue;
      const value = isAttacker ? card.sword : card.shield;
      if (value > bestValue) {
        bestValue = value;
        bestIdx = pickMoves.indexOf(m);
      }
    }

    if (bestValue === 0 && drawMove) return drawMove;
    return pickMoves[bestIdx] ?? drawMove ?? moves[0];
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private getTroopsAtTile(G: MyGameState, playerID: string, bx: number, by: number): number {
    const player = G.playerInfo[playerID];
    if (!player) return 0;
    let troops = 0;
    for (const fleet of player.fleetInfo) {
      if (fleet.location[0] === bx && fleet.location[1] === by && fleet.skyships > 0) {
        troops += fleet.regiments + fleet.levies * 0.5 + fleet.eliteRegiments * 1.5;
      }
    }
    return troops;
  }
}
