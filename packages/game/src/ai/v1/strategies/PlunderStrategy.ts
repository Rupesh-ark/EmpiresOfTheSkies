/** @deprecated v1 scoring system — kept for non-actions phases. See ../../evaluators/ for v2. */
import type { PhaseStrategy, AIPersonality, AIMove, ScoredAIMove } from "../../types.js";
import type { MyGameState } from "../../../types.js";
import type { Ctx } from "boardgame.io";

/**
 * Plunder legends strategy: decide whether to plunder a legend tile.
 * Plundering gives resources but advances heresy by 1.
 * - Aggressive/Economic: plunder for resources
 * - Religious (orthodox): avoid plundering (heresy cost)
 * - Heretic: plunder freely (heresy advance is beneficial)
 */
export class PlunderStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    availableMoves?: AIMove[]
  ): ScoredAIMove {
    const moves = availableMoves ?? [];
    if (moves.length === 0) return { move: { move: "doNotPlunder", args: [] }, score: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0 };

    const plunderMove = moves.find((m) => m.move === "plunder");
    const doNotPlunder = moves.find((m) => m.move === "doNotPlunder");

    if (!plunderMove) return { move: doNotPlunder ?? moves[0], score: 0 };
    if (!doNotPlunder) return { move: plunderMove, score: 0 };

    const player = G.playerInfo[playerID];
    const w = personality.weights;
    const aggression = personality.tacticalPreferences.aggressionLevel;

    const [bx, by] = G.mapState.currentBattle ?? [0, 0];
    const tile = G.mapState.currentTileArray[by]?.[bx];
    let lootValue = 0;
    if (tile?.loot?.colony) {
      const loot = tile.loot.colony;
      lootValue = loot.gold + loot.mithril + loot.dragonScales +
        loot.krakenSkin + loot.magicDust + loot.stickyIchor + loot.pipeweed;
    }

    let heresyCost = 0;
    if (player.hereticOrOrthodox === "orthodox") {
      heresyCost = 0.15 * w.religion;
    } else {
      heresyCost = -0.05 * w.religion;
    }

    const resourceValue = lootValue * 0.03 * w.economy;
    const aggressionBonus = aggression * 0.1;

    const plunderScore = resourceValue + aggressionBonus - heresyCost;
    const passScore = 0.02;

    if (plunderScore > passScore) {
      return { move: plunderMove, score: plunderScore };
    }
    return { move: doNotPlunder, score: passScore };
  }
}
