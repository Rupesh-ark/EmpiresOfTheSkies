/**
 * V2 Move Evaluation Types
 *
 * Each move evaluates itself independently — no move competes against another.
 * The heuristic layer filters bad moves; MCTS (future) picks from the rest.
 */
import type { MyGameState } from "../../types";
import type { AIMove } from "../types";

// Core evaluation result

export interface MoveEval {
  move: AIMove;
  viable: boolean;       // passes quality threshold?
  quality: number;       // 0-1, for MCTS prior (not for move-vs-move comparison)
  reason: string;        // for analytics: why this score
}

// Bot personality (derived from dealt cards)

export interface BotPersonality {
  kaCard: string;        // "patriarch_of_the_church", "elite_regiments", etc.
  legacyCard: string;    // "the merchant", "the conqueror", etc.
  alignment: string;     // "heretic" | "orthodox"
  legacyCardColour: string; // "purple" (orthodox) | "orange" (heretic) | "none"
}

// Evaluator function signature

export type MoveEvaluator = (
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
) => MoveEval;

