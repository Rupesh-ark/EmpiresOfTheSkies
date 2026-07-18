import type { Ctx } from "boardgame.io";
import type { MyGameState } from "../types.js";
import type { AIMove, BotConfig } from "./types.js";
import { enumerateLegalMoves } from "./enumerate.js";
import { getAILogger } from "./AILogger.js";
import type { MCTSStats } from "./AILogger.js";
import type { PlayerSnapshot } from "./GameRecorder.js";
import log from "../helpers/logger.js";

// Phase evaluators
import { evaluateActions } from "./evaluators/ActionsEvaluator.js";
import { evaluateDiscovery, pickDiscoveryMove } from "./evaluators/discovery/DiscoveryEvaluator.js";
import { evaluateEvents, pickEventsMove } from "./evaluators/events/EventsEvaluator.js";
import { evaluateResolution, pickResolutionMove } from "./evaluators/resolution/ResolutionEvaluator.js";
import type { BotPersonality } from "./evaluators/types.js";
import { computeArchetypeQualities, scoreLegacySynergy } from "./evaluators/archetypes.js";
import { mctsSearch } from "./mcts/MCTSSearch.js";

export class EmpiresBot {
  private config: BotConfig;
  private personality: BotPersonality | null = null;
  private _thinking: boolean = false;
  private lastSnapshot: PlayerSnapshot | null = null;

  constructor(config: BotConfig) {
    this.config = config;
  }


  isThinking(): boolean {
    return this._thinking;
  }

  setThinking(v: boolean): void {
    this._thinking = v;
  }

  getPersonality(): BotPersonality | null {
    return this.personality;
  }

  getConfig(): BotConfig {
    return this.config;
  }


  setSnapshot(snapshot: PlayerSnapshot): void {
    this.lastSnapshot = snapshot;
  }

  getLastSnapshot(): PlayerSnapshot | null {
    return this.lastSnapshot;
  }


  private initializePersonality(G: MyGameState, playerID: string): void {
    const player = G.playerInfo[playerID];
    const kaCard = player.resources.advantageCard ?? "none";
    const legacyCard = player.resources.legacyCard?.name ?? "none";
    const legacyColour = player.resources.legacyCard?.colour ?? "none";
    this.personality = {
      kaCard,
      legacyCard,
      alignment: player.hereticOrOrthodox ?? "orthodox",
      legacyCardColour: legacyColour,
      baseQualities: computeArchetypeQualities(kaCard, legacyCard, legacyColour),
    };
  }

  private defaultPersonality(): BotPersonality {
    return { kaCard: "none", legacyCard: "none", alignment: "orthodox", legacyCardColour: "none" };
  }


  chooseMove(G: MyGameState, ctx: Ctx, playerID: string): AIMove | null {
    const startTime = Date.now();

    // Lazy initialization
    if (!this.personality) {
      const player = G.playerInfo[playerID];
      if (player?.resources.advantageCard) {
        this.initializePersonality(G, playerID);
      }
    }

    // Card-picking phases (setup) — simple heuristics
    if (G.stage.sub === "kingdom_advantage") {
      return this.chooseKACard(G, playerID);
    }
    if (G.stage.sub === "legacy_card") {
      return this.chooseLegacyCard(G, playerID);
    }
    if (G.stage.phase === "reset" && G.stage.sub === "round_summary") {
      return (G.roundSummaryAck ?? []).includes(playerID)
        ? null
        : { move: "acknowledgeRoundSummary", args: [] };
    }

    const personality = this.personality ?? this.defaultPersonality();
    const availableMoves = enumerateLegalMoves(G, ctx, playerID);

    if (availableMoves.length === 0) return null;

    // Route to phase-specific v2 evaluator
    // (Don't early-return for single moves — some sub-stages need overrides)
    const phase = G.stage.phase;
    let chosen: AIMove | null = null;
    let chosenScore = 0;
    let topMoves: { move: string; args: any[]; score: number }[] | undefined;
    let mctsStats: MCTSStats | undefined;

    if (phase === "actions") {
      // Sub-stage flow control — handle mechanical stages before evaluator
      if (G.stage.sub === "confirm_fow_draw") {
        // trainTroops sets this stage. The only valid move is drawFoWCards.
        // Enumerate incorrectly returns confirmAction — override it.
        chosen = { move: "drawFoWCards", args: [] };
        chosenScore = 0;
      } else if (G.stage.sub === "discard_fow") {
        // Choose which FoW card to discard — use evaluator (simple decision)
        const { viable } = evaluateActions(G, playerID, availableMoves, personality);
        if (viable.length > 0) {
          // Pick best quality for discard (not worth MCTS)
          viable.sort((a, b) => b.quality - a.quality);
          chosen = viable[0].move;
          chosenScore = viable[0].quality;
        }
      } else if (G.playerInfo[playerID].turnComplete) {
        chosen = { move: "confirmAction", args: [] };
        chosenScore = 0;
      } else {
        // Normal actions — MCTS search over viable moves
        const { viable } = evaluateActions(G, playerID, availableMoves, personality);
        if (viable.length > 0) {
          const allPersonalities = this.getAllPersonalities(G);
          const result = mctsSearch(G, playerID, viable, allPersonalities, "fast");
          chosen = result.chosenMove;
          chosenScore = result.averageReward;
          topMoves = result.children.slice(0, 5).map(c => ({
            move: c.move, args: [], score: c.avgReward,
          }));

          // Build MCTS analytics
          const evalTop = [...viable].sort((a, b) => b.quality - a.quality)[0];
          mctsStats = {
            simulations: result.simulations,
            timeMs: result.timeMs,
            children: result.children.map(c => {
              const match = viable.find(v => v.move.move === c.move);
              return { move: c.move, visits: c.visits, avgReward: c.avgReward, quality: match?.quality ?? 0 };
            }),
            overrodeEvaluator: evalTop.move.move !== result.chosenMove.move,
            evaluatorTopMove: evalTop.move.move,
          };
        }
      }
    } else if (phase === "discovery") {
      const { viable } = evaluateDiscovery(G, playerID, availableMoves, personality);
      const pick = pickDiscoveryMove(viable);
      if (pick) {
        chosen = pick.move;
        chosenScore = pick.quality;
        topMoves = viable.slice(0, 5).map(v => ({ move: v.move.move, args: v.move.args, score: v.quality }));
      }
    } else if (phase === "events") {
      const { viable } = evaluateEvents(G, playerID, availableMoves, personality);
      const pick = pickEventsMove(viable);
      if (pick) {
        chosen = pick.move;
        chosenScore = pick.quality;
        topMoves = viable.slice(0, 5).map(v => ({ move: v.move.move, args: v.move.args, score: v.quality }));
      }
    } else if (phase === "resolution") {
      const { viable } = evaluateResolution(G, playerID, availableMoves, personality);
      const pick = pickResolutionMove(viable);
      if (pick) {
        chosen = pick.move;
        chosenScore = pick.quality;
        topMoves = viable.slice(0, 5).map(v => ({ move: v.move.move, args: v.move.args, score: v.quality }));
      }
    }

    // Fallback: random from available
    if (!chosen) {
      const idx = Math.floor(Math.random() * availableMoves.length);
      chosen = availableMoves[idx];
      chosenScore = 0;
      this.logDecision(G, ctx, playerID, availableMoves, chosen, chosenScore, "fallback", startTime);
      return chosen;
    }

    this.logDecision(G, ctx, playerID, availableMoves, chosen, chosenScore, "best_score", startTime, topMoves, mctsStats);
    return chosen;
  }


  private getAllPersonalities(G: MyGameState): Record<string, BotPersonality> {
    const result: Record<string, BotPersonality> = {};
    for (const [pid, player] of Object.entries(G.playerInfo)) {
      result[pid] = {
        kaCard: player.resources.advantageCard ?? "none",
        legacyCard: player.resources.legacyCard?.name ?? "none",
        alignment: player.hereticOrOrthodox ?? "orthodox",
        legacyCardColour: player.resources.legacyCard?.colour ?? "none",
      };
    }
    return result;
  }


  private chooseKACard(G: MyGameState, playerID: string): AIMove | null {
    const pool = G.cardDecks.kingdomAdvantagePool;
    if (pool.length === 0) return null;
    // Random pick for card selection
    const idx = Math.floor(Math.random() * pool.length);
    return { move: "pickKingdomAdvantageCard", args: [pool[idx]] };
  }

  private chooseLegacyCard(G: MyGameState, playerID: string): AIMove | null {
    const options = G.playerInfo[playerID].legacyCardOptions;
    if (!options || options.length === 0) return null;
    const kaCard = G.playerInfo[playerID].resources.advantageCard ?? "none";
    const best = scoreLegacySynergy(kaCard, options);
    this.personality = null;
    return { move: "pickLegacyCard", args: [best] };
  }


  private logDecision(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    allMoves: AIMove[],
    chosen: AIMove,
    chosenScore: number,
    reason: "best_score" | "random_override" | "forced" | "fallback",
    startTime: number,
    preScored?: { move: string; args: any[]; score: number }[],
    mctsStats?: MCTSStats,
  ): void {
    const personality = this.personality ?? this.defaultPersonality();

    const scored = preScored ?? allMoves
      .slice(0, 5)
      .map((m) => ({ move: m.move, args: m.args, score: 0 }));

    getAILogger().logDecision({
      round: G.round,
      phase: ctx.phase ?? "unknown",
      stage: G.stage ? `${G.stage.phase}/${G.stage.sub}` : "unknown",
      playerID,
      personalityName: `${personality.kaCard}+${personality.legacyCard}`,
      legalMoveCount: allMoves.length,
      legalMoveNames: [...new Set(allMoves.map((m) => m.move))],
      topScoredMoves: scored,
      chosenMove: chosen.move,
      chosenArgs: chosen.args,
      chosenScore,
      reason,
      decisionTimeMs: Date.now() - startTime,
      mctsStats,
    });
  }
}
