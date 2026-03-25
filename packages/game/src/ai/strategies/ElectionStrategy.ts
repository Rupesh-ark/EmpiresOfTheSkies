import type { PhaseStrategy, AIPersonality, AIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../enumerate";

/**
 * Election strategy: vote for Archprelate based on personality.
 * - Religious bot: vote for self or aligned player
 * - Aggressive bot: vote against the leader
 * - Economic bot: vote for least threatening player
 */
export class ElectionStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality
  ): AIMove {
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) return { move: "vote", args: [playerID] };
    if (moves.length === 1) return moves[0];

    const voteMoves = moves.filter((m) => m.move === "vote");
    if (voteMoves.length === 0) return moves[0];

    const player = G.playerInfo[playerID];
    const w = personality.weights;
    const allPlayers = Object.values(G.playerInfo);
    const leaderVP = Math.max(...allPlayers.map((p) => p.resources.victoryPoints));

    let bestMove = voteMoves[0];
    let bestScore = -Infinity;

    for (const m of voteMoves) {
      const targetID = m.args[0] as string;
      const target = G.playerInfo[targetID];
      if (!target) continue;

      let score = 0;

      // Self-vote: always a baseline option
      if (targetID === playerID) {
        score += 0.3 * w.religion;
        // Bonus if we have cathedrals/palaces (religious standing)
        score += (player.cathedrals + player.palaces) * 0.05;
      } else {
        // Religious: prefer aligned players
        if (w.religion > 0.15) {
          if (target.hereticOrOrthodox === player.hereticOrOrthodox) {
            score += 0.2 * w.religion;
          } else {
            score -= 0.15 * w.religion;
          }
        }

        // Aggressive: vote against the leader (vote for weakest non-leader)
        if (w.military > 0.15) {
          const targetVP = target.resources.victoryPoints;
          if (targetVP === leaderVP) {
            score -= 0.2; // don't make the leader Archprelate
          } else {
            score += (1 - targetVP / (leaderVP || 1)) * 0.1 * w.military;
          }
        }

        // Economic: prefer least militarily threatening player
        if (w.economy > 0.15) {
          const threatLevel = target.resources.regiments + target.resources.skyships;
          score -= threatLevel * 0.005 * w.economy;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }

    return bestMove;
  }
}
