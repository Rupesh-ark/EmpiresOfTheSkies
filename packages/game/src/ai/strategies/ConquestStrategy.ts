import type { PhaseStrategy, AIPersonality, AIMove } from "../types";
import type { MyGameState } from "../../types";
import type { Ctx } from "boardgame.io";
import { enumerateLegalMoves } from "../enumerate";

/**
 * Conquest strategy: decide whether to colonise, build outpost, or pass.
 * - Empire Builder: always expand
 * - Economic: prefer colonies (trade routes, factory income)
 * - Military: prefer outposts (cheaper, wider spread)
 */
export class ConquestStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality
  ): AIMove {
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) return { move: "doNothing", args: [] };
    if (moves.length === 1) return moves[0];

    // Handle card draw/pick sub-stages
    if (G.stage.sub === "conquest_draw_or_pick") {
      return this.pickConquestCard(G, playerID, moves);
    }

    const w = personality.weights;
    const player = G.playerInfo[playerID];
    const doNothing = moves.find((m) => m.move === "doNothing");
    const colonise = moves.find((m) => m.move === "coloniseLand");
    const outpostMoves = moves.filter((m) => m.move === "constructOutpost");

    // Count undefended outposts (no garrison, no fort)
    let undefendedOutposts = 0;
    G.mapState.buildings.forEach((row) =>
      row.forEach((cell) => {
        if (cell.player?.id !== playerID) return;
        if (cell.buildings !== "outpost") return;
        const hasDefense =
          (cell.garrisonedRegiments ?? 0) + (cell.garrisonedLevies ?? 0) > 0 || cell.fort;
        if (!hasDefense) undefendedOutposts++;
      })
    );

    // Too many undefended outposts and not a territory-focused bot? Don't expand
    if (undefendedOutposts >= 3 && w.territory < 0.2 && w.threats > 0.1) {
      return doNothing ?? moves[0];
    }

    // Can we afford to garrison a colony? (need regiments at the tile)
    const hasTroopsForGarrison = player.fleetInfo.some((f) => {
      const [bx, by] = G.mapState.currentBattle ?? [0, 0];
      return f.location[0] === bx && f.location[1] === by && (f.regiments > 0 || f.eliteRegiments > 0);
    });

    // Score options
    let bestMove = doNothing ?? moves[0];
    let bestScore = 0.01; // doNothing baseline

    if (colonise) {
      let score = 0.5 * w.territory + 0.2 * w.legacy;
      // Economic bots love colonies (trade routes → factory income)
      score += 0.15 * w.economy;
      // But only if we can garrison it
      if (!hasTroopsForGarrison) score *= 0.5;
      if (score > bestScore) { bestScore = score; bestMove = colonise; }
    }

    for (const m of outpostMoves) {
      let score = 0.35 * w.territory + 0.1 * w.economy;
      // Military bots prefer outposts (cheap, wide coverage)
      score += 0.1 * w.military;
      if (score > bestScore) { bestScore = score; bestMove = m; }
    }

    return bestMove;
  }

  private pickConquestCard(G: MyGameState, playerID: string, moves: AIMove[]): AIMove {
    const pickMoves = moves.filter((m) => m.move === "pickCardConquest");
    const drawMove = moves.find((m) => m.move === "drawCardConquest");

    if (pickMoves.length === 0) return drawMove ?? moves[0];

    const hand = G.playerInfo[playerID].resources.fortuneCards;
    // For conquest battles, pick highest sword card
    let bestIdx = 0;
    let bestValue = -1;
    for (const m of pickMoves) {
      const cardIdx = m.args[0] as number;
      const card = hand[cardIdx];
      if (!card) continue;
      if (card.sword > bestValue) {
        bestValue = card.sword;
        bestIdx = pickMoves.indexOf(m);
      }
    }
    if (bestValue === 0 && drawMove) return drawMove;
    return pickMoves[bestIdx] ?? drawMove ?? moves[0];
  }
}
