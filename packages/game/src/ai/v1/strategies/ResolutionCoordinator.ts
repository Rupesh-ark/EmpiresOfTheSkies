import type { PhaseStrategy, AIPersonality, AIMove, ScoredAIMove } from "../../types.js";
import type { MyGameState } from "../../../types.js";
import type { Ctx } from "boardgame.io";
import { AerialBattleStrategy } from "./AerialBattleStrategy.js";
import { GroundBattleStrategy } from "./GroundBattleStrategy.js";
import { ConquestStrategy } from "./ConquestStrategy.js";
import { PlunderStrategy } from "./PlunderStrategy.js";
import { ElectionStrategy } from "./ElectionStrategy.js";
import { ResolutionStrategy } from "./ResolutionStrategy.js";
import log from "../../../helpers/logger.js";

export class ResolutionCoordinator implements PhaseStrategy {
  private aerial = new AerialBattleStrategy();
  private ground = new GroundBattleStrategy();
  private conquest = new ConquestStrategy();
  private plunder = new PlunderStrategy();
  private election = new ElectionStrategy();
  private resolution = new ResolutionStrategy();

  selectMove(G: MyGameState, ctx: Ctx, playerID: string, personality: AIPersonality, availableMoves?: AIMove[]): ScoredAIMove {
    const sub = G.stage.sub;

    let result: ScoredAIMove;
    let strategyName: string;

    if (sub === "aerial_attack_or_pass" || sub === "aerial_attack_or_evade"
        || sub === "aerial_resolve" || sub === "relocate_loser") {
      result = this.aerial.selectMove(G, ctx, playerID, personality, availableMoves);
      strategyName = "AerialBattleStrategy";
    } else if (sub === "ground_attack_or_pass" || sub === "ground_defend_or_yield"
        || sub === "ground_resolve" || sub === "ground_garrison") {
      result = this.ground.selectMove(G, ctx, playerID, personality, availableMoves);
      strategyName = "GroundBattleStrategy";
    } else if (sub === "conquest" || sub === "conquest_draw_or_pick" || sub === "conquest_garrison") {
      result = this.conquest.selectMove(G, ctx, playerID, personality, availableMoves);
      strategyName = "ConquestStrategy";
    } else if (sub === "plunder_legends") {
      result = this.plunder.selectMove(G, ctx, playerID, personality, availableMoves);
      strategyName = "PlunderStrategy";
    } else if (sub === "election") {
      result = this.election.selectMove(G, ctx, playerID, personality, availableMoves);
      strategyName = "ElectionStrategy";
    } else {
      result = this.resolution.selectMove(G, ctx, playerID, personality, availableMoves);
      strategyName = "ResolutionStrategy";
    }

    log.info({ sub, strategyName, move: result.move.move, score: result.score }, "ResolutionCoordinator decision");

    return result;
  }
}
