import type { PhaseStrategy, AIPersonality, AIMove, ScoredAIMove } from "../../types";
import type { MyGameState } from "../../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../../enumerate";

export class RandomFallbackStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    _personality: AIPersonality
  ): ScoredAIMove {
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) {
      return { move: { move: "pass", args: [] }, score: 0 };
    }
    return { move: moves[Math.floor(Math.random() * moves.length)], score: 0 };
  }
}
