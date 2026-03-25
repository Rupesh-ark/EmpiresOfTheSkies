import type { PhaseStrategy, AIPersonality, AIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../enumerate";

export class RandomFallbackStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    _personality: AIPersonality
  ): AIMove {
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) {
      return { move: "pass", args: [] };
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }
}
