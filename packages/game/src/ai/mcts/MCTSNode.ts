/**
 * MCTS Tree Node
 */
import type { AIMove } from "../types";
import type { MoveEval } from "../evaluators/types";

export class MCTSNode {
  move: AIMove | null;      // null for root
  quality: number;           // v2 evaluator quality (prior)
  visits: number = 0;
  totalReward: number = 0;
  children: MCTSNode[] = [];
  parent: MCTSNode | null;

  constructor(move: AIMove | null, quality: number, parent: MCTSNode | null) {
    this.move = move;
    this.quality = quality;
    this.parent = parent;
  }

  get averageReward(): number {
    return this.visits > 0 ? this.totalReward / this.visits : 0;
  }

  /** UCB1 score with quality prior */
  ucb1(explorationConstant: number, parentVisits: number): number {
    if (this.visits === 0) {
      // Unvisited: use quality as initial estimate + high exploration bonus
      return this.quality + explorationConstant * 2;
    }
    const exploit = this.averageReward;
    const explore = explorationConstant * Math.sqrt(Math.log(parentVisits) / this.visits);
    return exploit + explore;
  }

  /** Select child with highest UCB1 */
  selectChild(explorationConstant: number): MCTSNode {
    let bestChild = this.children[0];
    let bestScore = -Infinity;

    for (const child of this.children) {
      const score = child.ucb1(explorationConstant, this.visits);
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /** Backpropagate reward up the tree */
  backpropagate(reward: number): void {
    let node: MCTSNode | null = this;
    while (node !== null) {
      node.visits += 1;
      node.totalReward += reward;
      node = node.parent;
    }
  }

  /** Get most visited child (the recommended move) */
  bestChild(): MCTSNode | null {
    if (this.children.length === 0) return null;
    return this.children.reduce((best, c) =>
      c.visits > best.visits ? c : best
    );
  }
}
