/** @deprecated v1 scoring system — kept for non-actions phases. See ../../evaluators/ for v2. */
import type { PhaseStrategy, AIPersonality, AIMove, ScoredAIMove } from "../../types";
import type { MyGameState } from "../../../types";
import type { Ctx } from "boardgame.io";
import { coloniseConfidence, hasTroopsAtTile } from "../../../helpers/fleetUtils";

/**
 * Conquest strategy: decide whether to colonise, build outpost, or pass.
 *
 * Uses coloniseConfidence() to assess whether the bot can beat the land's
 * defences. Confident → colonise. Risky → outpost (safe). Hopeless → skip.
 */
export class ConquestStrategy implements PhaseStrategy {
  selectMove(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    personality: AIPersonality,
    availableMoves?: AIMove[]
  ): ScoredAIMove {
    const moves = availableMoves ?? [];
    if (moves.length === 0) return { move: { move: "doNothing", args: [] }, score: 0 };
    if (moves.length === 1) return { move: moves[0], score: 0 };

    // Handle card draw/pick sub-stages
    if (G.stage.sub === "conquest_draw_or_pick") {
      return { move: this.pickConquestCard(G, playerID, moves), score: 0 };
    }

    const w = personality.weights;
    const player = G.playerInfo[playerID];
    const doNothing = moves.find((m) => m.move === "doNothing");
    const colonise = moves.find((m) => m.move === "coloniseLand");
    const outpostMoves = moves.filter((m) => m.move === "constructOutpost");

    const [bx, by] = G.mapState.currentBattle ?? [0, 0];
    const canGarrison = hasTroopsAtTile(player, bx, by);

    // Count undefended outposts (no garrison, no fort)
    let undefendedOutposts = 0;
    G.mapState.buildings.forEach((row) =>
      row.forEach((cell) => {
        if (cell.player?.id !== playerID) return;
        if (cell.buildings !== "outpost") return;
        const hasDefense =
          (cell.garrisonedRegiments ?? 0) + (cell.garrisonedLevies ?? 0) > 0 || cell.fort.length > 0;
        if (!hasDefense) undefendedOutposts++;
      })
    );

    // Too many undefended outposts and not a territory-focused bot? Don't expand
    if (undefendedOutposts >= 3 && w.territory < 0.2 && w.threats > 0.1) {
      return { move: doNothing ?? moves[0], score: 0 };
    }

    // Colonise sense
    const confidence = colonise ? coloniseConfidence(G, playerID, bx, by) : 0;
    const aggression = personality.tacticalPreferences.aggressionLevel;

    let bestMove = doNothing ?? moves[0];
    let bestScore = 0.01; // doNothing baseline

    if (colonise && canGarrison) {
      if (confidence >= 1.5) {
        // Comfortable win — colonise confidently
        const score = 0.6 * w.territory + 0.2 * w.legacy + 0.15 * w.economy;
        if (score > bestScore) { bestScore = score; bestMove = colonise; }
      } else if (confidence >= 1.0) {
        // Risky — aggressive bots might try
        const score = (0.3 + aggression * 0.2) * w.territory + 0.1 * w.legacy;
        if (score > bestScore) { bestScore = score; bestMove = colonise; }
      }
      // Below 1.0: too risky, fall through to outpost
    }

    for (const m of outpostMoves) {
      let score = 0.35 * w.territory + 0.1 * w.economy + 0.1 * w.military;
      // If colonise is available but too risky, outpost gets a safety bonus
      if (colonise && confidence < 1.5) {
        score += 0.1;
      }
      if (score > bestScore) { bestScore = score; bestMove = m; }
    }

    return { move: bestMove, score: bestScore };
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
