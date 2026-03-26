import type { PhaseStrategy, AIPersonality, AIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../enumerate";

/**
 * Ground battle strategy: decide whether to attack buildings,
 * defend or yield, and how many troops to garrison.
 */
export class GroundBattleStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality
  ): AIMove {
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) return { move: "doNotGroundAttack", args: [] };
    if (moves.length === 1) return moves[0];

    switch (G.stage.sub) {
      case "ground_attack_or_pass":
        return this.decideGroundAttack(G, playerID, personality, moves);

      case "ground_defend_or_yield":
        return this.decideDefend(G, playerID, personality, moves);

      case "ground_garrison":
        return this.decideGarrison(G, playerID, personality, moves);

      case "conquest_draw_or_pick":
        return this.pickFoWCard(G, playerID, moves);

      default:
        return moves[0];
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

    for (const m of attackMoves) {
      const targetID = m.args[0] as string;
      const building = G.mapState.buildings[by]?.[bx];
      const garrisonStrength =
        (building?.garrisonedRegiments ?? 0) +
        (building?.garrisonedLevies ?? 0) * 0.5 +
        (building?.garrisonedEliteRegiments ?? 0) * 1.5;
      const hasFort = building?.fort ? 2 : 0; // fort adds defensive bonus

      const defenseStrength = garrisonStrength + hasFort;
      if (defenseStrength === 0) return m; // undefended — free capture

      const ratio = myTroops / defenseStrength;
      if (ratio < threshold) continue;

      // Score: advantage ratio + target value
      let score = ratio;
      const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
      const allVPs = Object.values(G.playerInfo).map((p) => p.resources.victoryPoints);
      const leaderVP = Math.max(...allVPs);
      if (targetVP === leaderVP) score += aggression * 0.3;

      // Colonies are more valuable to capture than outposts
      if (building?.buildings === "colony") score += 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = m;
      }
    }

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

    // Our defense strength: garrison + fort
    const garrisonStrength =
      (building?.garrisonedRegiments ?? 0) +
      (building?.garrisonedLevies ?? 0) * 0.5 +
      (building?.garrisonedEliteRegiments ?? 0) * 1.5;
    const fortBonus = building?.fort ? 2 : 0;
    const defenseTotal = garrisonStrength + fortBonus;

    // Attacker strength: their troops at this tile
    const attacker = G.battleState?.attacker;
    const attackerID = attacker?.id;
    const attackerTroops = attackerID ? this.getTroopsAtTile(G, attackerID, bx, by) : 0;

    const aggression = personality.tacticalPreferences.aggressionLevel;

    // How valuable is this building?
    const isColony = building?.buildings === "colony";
    const buildingValue = isColony ? 0.8 : 0.4;

    // Defend if we have reasonable chance or building is very valuable
    if (defenseTotal > 0 && (defenseTotal / (attackerTroops || 1) >= 0.5 || buildingValue > 0.6)) {
      return defendMove;
    }

    // Aggressive personality defends more
    if (aggression > 0.6 && defenseTotal > 0) {
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

    // Use troopsAvailableForGarrison from pre-computed state
    const available = G.troopsAvailableForGarrison;
    const aggression = personality.tacticalPreferences.aggressionLevel;

    // Aggressive: garrison everything (hold territory)
    // Economic: garrison minimum (keep troops mobile for future)
    const garrisonFraction = 0.5 + aggression * 0.5; // 0.5 to 1.0

    const regs = Math.ceil(available.regiments * garrisonFraction);
    const levies = Math.ceil(available.levies * garrisonFraction);
    const elites = Math.ceil(available.elites * garrisonFraction);

    // Find the move closest to our desired garrison
    // garrisonTroops args: [[regiments, levies, eliteRegiments]]
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
