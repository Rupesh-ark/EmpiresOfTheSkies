import type { PhaseStrategy, AIPersonality, AIMove, ScoredAIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { calculateVotePower } from "../../moves/election/vote";

/**
 * Election strategy: vote for Archprelate based on strategic reasoning.
 *
 * Algorithm:
 * 1. Calculate vote power for every player.
 * 2. Assume everyone else votes for themselves (baseline expected totals).
 * 3. Decide: can I win by voting self? If so, do it.
 * 4. Otherwise find the best strategic vote that either beats the VP leader
 *    or, failing that, empowers the least-threatening rival.
 */
export class ElectionStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    availableMoves?: AIMove[]
  ): ScoredAIMove {
    const moves = availableMoves ?? [];
    if (moves.length === 0) return { move: { move: "vote", args: [playerID] }, score: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0 };

    const voteMoves = moves.filter((m) => m.move === "vote");
    if (voteMoves.length === 0) return { move: moves[0], score: 0 };

    const allPlayers = Object.values(G.playerInfo);
    const playOrder = ctx.playOrder;

    // Step 1: calculate each player's vote power
    const power: Record<string, number> = {};
    for (const pid of playOrder) {
      power[pid] = calculateVotePower(G, pid);
    }

    const myPower = power[playerID] ?? 0;

    // Step 2: baseline — assume everyone votes for themselves
    // expected[id] = votes that candidate id would receive if every voter self-votes
    const expected: Record<string, number> = {};
    for (const pid of playOrder) {
      expected[pid] = power[pid] ?? 0;
    }

    // Step 3: identify VP leader (highest VP; tie → earlier in playOrder)
    let leaderID = playOrder[0];
    let leaderVP = G.playerInfo[leaderID]?.resources.victoryPoints ?? 0;
    for (const pid of playOrder) {
      const vp = G.playerInfo[pid]?.resources.victoryPoints ?? 0;
      if (vp > leaderVP) {
        leaderVP = vp;
        leaderID = pid;
      }
    }

    // Step 4: identify current Archprelate (incumbent wins ties)
    const incumbentID =
      allPlayers.find((p) => p.isArchprelate)?.id ?? null;
    const iAmIncumbent = incumbentID === playerID;

    // Helper: given that I cast my vote for targetID, would targetID win?
    // We recalculate totals with my vote redirected to target.
    const wouldWin = (targetID: string): boolean => {
      // Rebuild totals: everyone votes for self except me
      const totals: Record<string, number> = { ...expected };
      // Remove my own self-contribution (since I'm voting for targetID instead)
      totals[playerID] = (totals[playerID] ?? 0) - myPower;
      // Add my power to the target
      totals[targetID] = (totals[targetID] ?? 0) + myPower;

      const targetTotal = totals[targetID] ?? 0;
      const maxOther = Math.max(
        ...playOrder.filter((id) => id !== targetID).map((id) => totals[id] ?? 0)
      );

      if (targetTotal > maxOther) return true;
      if (targetTotal === maxOther) {
        // Tie-break: incumbent keeps title
        if (incumbentID === targetID) return true;
        // No incumbent: first in playOrder wins
        if (!incumbentID) {
          // Find who among tied players appears first in playOrder
          const tiedPlayers = playOrder.filter(
            (id) => (totals[id] ?? 0) === targetTotal
          );
          return tiedPlayers[0] === targetID;
        }
        return false;
      }
      return false;
    };

    // --- Decision logic ---

    // Case A: I am the VP leader — protect position by voting self
    if (leaderID === playerID) {
      const selfMove = voteMoves.find((m) => m.args[0] === playerID);
      if (selfMove) return { move: selfMove, score: 0 };
    }

    // Case B: Can I win by voting for myself?
    // Only worth checking if I have nonzero power
    if (myPower > 0) {
      const selfWins = wouldWin(playerID);
      const religiousBot = personality.weights.religion > 0.15;

      if (selfWins) {
        const selfMove = voteMoves.find((m) => m.args[0] === playerID);
        if (selfMove) return { move: selfMove, score: 0 };
      }

      // Religious bots: also self-vote when one more vote could tip it
      // (optimistically assumes a rival might vote for us)
      if (religiousBot && !selfWins) {
        const bestRival = Math.max(
          ...playOrder.filter((id) => id !== playerID).map((id) => expected[id] ?? 0)
        );
        if (myPower >= bestRival - 1 || (iAmIncumbent && myPower >= bestRival)) {
          const selfMove = voteMoves.find((m) => m.args[0] === playerID);
          if (selfMove) return { move: selfMove, score: 0 };
        }
      }
    }

    // Case C: Find best strategic vote — prefer viable candidates that can beat
    // the VP leader, choosing the one with the fewest VP (least harmful to empower)
    const rivals = playOrder.filter((id) => id !== playerID && id !== leaderID);

    let bestCandidate: string | null = null;
    let bestCandidateVP = Infinity;

    for (const rival of rivals) {
      if (!wouldWin(rival)) continue;
      const rivalVP = G.playerInfo[rival]?.resources.victoryPoints ?? 0;
      if (rivalVP < bestCandidateVP) {
        bestCandidateVP = rivalVP;
        bestCandidate = rival;
      }
    }

    if (bestCandidate !== null) {
      const move = voteMoves.find((m) => m.args[0] === bestCandidate);
      if (move) return { move, score: 0 };
    }

    // Case D: Nobody can beat the leader even with my help.
    // Vote for lowest-VP non-leader player (least damaging Archprelate).
    const nonLeaders = playOrder.filter((id) => id !== leaderID);
    let fallbackTarget = playerID; // default self if all else fails
    let lowestVP = Infinity;
    for (const pid of nonLeaders) {
      const vp = G.playerInfo[pid]?.resources.victoryPoints ?? 0;
      if (vp < lowestVP) {
        lowestVP = vp;
        fallbackTarget = pid;
      }
    }

    const fallbackMove = voteMoves.find((m) => m.args[0] === fallbackTarget);
    return { move: fallbackMove ?? voteMoves[0], score: 0 };
  }
}
