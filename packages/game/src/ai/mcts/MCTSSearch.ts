/**
 * MCTS Search
 *
 * Given a game state and viable moves (from v2 evaluators),
 * runs N simulations to find the best move.
 */
import type { MyGameState } from "../../types";
import type { AIMove } from "../types";
import type { MoveEval, BotPersonality } from "../evaluators/types";
import { MCTSNode } from "./MCTSNode";
import { rollout, applyMove } from "./StateSimulator";
import { MCTS_CONFIG } from "./config";
import { invalidateRouteCache } from "./RouteCache";

function deepCloneGameState(G: MyGameState): MyGameState {
  return JSON.parse(JSON.stringify(G));
}

export interface MCTSResult {
  chosenMove: AIMove;
  visits: number;
  averageReward: number;
  simulations: number;
  timeMs: number;
  children: { move: string; visits: number; avgReward: number }[];
}

export function mctsSearch(
  G: MyGameState,
  playerID: string,
  viableMoves: MoveEval[],
  personalities: Record<string, BotPersonality>,
  mode: "fast" | "play" = "fast",
): MCTSResult {
  const config = MCTS_CONFIG[mode];
  const startTime = Date.now();

  const root = new MCTSNode(null, 0, null);
  for (const moveEval of viableMoves) {
    root.children.push(new MCTSNode(moveEval.move, moveEval.quality, root));
  }

  if (root.children.length === 0) {
    return {
      chosenMove: viableMoves[0]?.move ?? { move: "pass", args: [] },
      visits: 0,
      averageReward: 0,
      simulations: 0,
      timeMs: 0,
      children: [],
    };
  }

  let simulationsRun = 0;

  for (let i = 0; i < config.simulationsPerMove; i++) {
    invalidateRouteCache();
    simulationsRun++;

    const selectedChild = root.selectChild(config.explorationConstant);

    const simState = deepCloneGameState(G);
    if (selectedChild.move) {
      applyMove(simState, playerID, selectedChild.move);
    }

    const reward = rollout(simState, playerID, personalities, config.rolloutDepth);
    const normalizedReward = Math.max(0, Math.min(1, reward / 100));

    const priorWeight = Math.max(0, 1 - selectedChild.visits / 10);
    const blendedReward = priorWeight * selectedChild.quality + (1 - priorWeight) * normalizedReward;

    selectedChild.backpropagate(blendedReward);

    if (i >= 4) {
      const best = root.bestChild();
      if (best && best.visits >= 5) {
        const totalVisits = root.children.reduce((sum, c) => sum + c.visits, 0);
        const bestShare = best.visits / totalVisits;
        if (bestShare > 0.80 && totalVisits >= 10) {
          break;
        }
      }
    }
  }

  const bestChild = root.bestChild();
  const timeMs = Date.now() - startTime;

  return {
    chosenMove: bestChild?.move ?? viableMoves[0].move,
    visits: bestChild?.visits ?? 0,
    averageReward: bestChild?.averageReward ?? 0,
    simulations: simulationsRun,
    timeMs,
    children: root.children.map(c => ({
      move: c.move?.move ?? "?",
      visits: c.visits,
      avgReward: c.averageReward,
    })).sort((a, b) => b.visits - a.visits),
  };
}
