/** @deprecated v1 scoring system — kept for non-actions phases. See ../../evaluators/ for v2. */
import type { PhaseStrategy, AIPersonality, AIMove, ScoredAIMove } from "../../types";
import type { MyGameState } from "../../../types";
import type { Ctx } from "boardgame.io";
import { calculateVotePower } from "../../../moves/election/vote";

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
    const expected: Record<string, number> = {};
    for (const pid of playOrder) {
      expected[pid] = power[pid] ?? 0;
    }

    // Step 3: identify VP leader
    let leaderID = playOrder[0];
    let leaderVP = G.playerInfo[leaderID]?.resources.victoryPoints ?? 0;
    for (const pid of playOrder) {
      const vp = G.playerInfo[pid]?.resources.victoryPoints ?? 0;
      if (vp > leaderVP) {
        leaderVP = vp;
        leaderID = pid;
      }
    }

    // Step 4: identify current Archprelate
    const incumbentID =
      allPlayers.find((p) => p.isArchprelate)?.id ?? null;
    const iAmIncumbent = incumbentID === playerID;

    const wouldWin = (targetID: string): boolean => {
      const totals: Record<string, number> = { ...expected };
      totals[playerID] = (totals[playerID] ?? 0) - myPower;
      totals[targetID] = (totals[targetID] ?? 0) + myPower;

      const targetTotal = totals[targetID] ?? 0;
      const maxOther = Math.max(
        ...playOrder.filter((id) => id !== targetID).map((id) => totals[id] ?? 0)
      );

      if (targetTotal > maxOther) return true;
      if (targetTotal === maxOther) {
        if (incumbentID === targetID) return true;
        if (!incumbentID) {
          const tiedPlayers = playOrder.filter(
            (id) => (totals[id] ?? 0) === targetTotal
          );
          return tiedPlayers[0] === targetID;
        }
        return false;
      }
      return false;
    };

    // Case A: I am the VP leader — protect position by voting self
    if (leaderID === playerID) {
      const selfMove = voteMoves.find((m) => m.args[0] === playerID);
      if (selfMove) return { move: selfMove, score: 0 };
    }

    // Case B: Can I win by voting for myself?
    if (myPower > 0) {
      const selfWins = wouldWin(playerID);
      const religiousBot = personality.weights.religion > 0.15;

      if (selfWins) {
        const selfMove = voteMoves.find((m) => m.args[0] === playerID);
        if (selfMove) return { move: selfMove, score: 0 };
      }

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

    // Case C: Find best strategic vote
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

    // Case D: Vote for lowest-VP non-leader player
    const nonLeaders = playOrder.filter((id) => id !== leaderID);
    let fallbackTarget = playerID;
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
