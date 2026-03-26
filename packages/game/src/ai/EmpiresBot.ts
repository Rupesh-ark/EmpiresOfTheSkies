import type { Ctx } from "boardgame.io";
import type { MyGameState } from "../types";
import type { AIMove, AIPersonality, BotConfig, AIWeights } from "./types";
import { AIStrategyRegistry } from "./AIStrategyRegistry";
import { RandomFallbackStrategy } from "./strategies/RandomFallback";
import { DiscoveryStrategy } from "./strategies/DiscoveryStrategy";
import { EventsStrategy } from "./strategies/EventsStrategy";
import { ActionsStrategy } from "./strategies/ActionsStrategy";
import { AerialBattleStrategy } from "./strategies/AerialBattleStrategy";
import { GroundBattleStrategy } from "./strategies/GroundBattleStrategy";
import { ElectionStrategy } from "./strategies/ElectionStrategy";
import { ConquestStrategy } from "./strategies/ConquestStrategy";
import { PlunderStrategy } from "./strategies/PlunderStrategy";
import { ResolutionStrategy } from "./strategies/ResolutionStrategy";
import { deriveWeightsFromCards } from "./personalities";
import { enumerateLegalMoves } from "./enumerate";
import { estimateMoveValue } from "./evaluate";
import { getAILogger } from "./AILogger";
import { AI_CONFIG } from "./weightsConfig";

export class EmpiresBot {
  private config: BotConfig;
  private personality: AIPersonality | null = null;
  private registry: AIStrategyRegistry;
  private _thinking: boolean = false;

  constructor(config: BotConfig) {
    this.config = config;
    this.registry = EmpiresBot.createRegistry();
  }

  // --- Public API ---

  isThinking(): boolean {
    return this._thinking;
  }

  setThinking(v: boolean): void {
    this._thinking = v;
  }

  getPersonality(): AIPersonality | null {
    return this.personality;
  }

  getConfig(): BotConfig {
    return this.config;
  }

  // --- Personality initialization ---

  initializePersonality(G: MyGameState, playerID: string): void {
    const player = G.playerInfo[playerID];
    const kaCard = player.resources.advantageCard;
    const legacyCard = player.resources.legacyCard;
    const alignment = player.hereticOrOrthodox;
    const mode = this.config.weightOverrideMode ?? "none";

    let weights: AIWeights;
    let name: string;

    if (mode === "full_override" && this.config.weightOverride) {
      // Use provided weights verbatim, normalize to sum 1.0
      weights = { ...this.config.weightOverride };
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      if (sum > 0) {
        for (const key of Object.keys(weights) as (keyof AIWeights)[]) {
          weights[key] /= sum;
        }
      }
      name = this.config.nameOverride ?? "Custom";
    } else if (mode === "modifier" && this.config.weightOverride) {
      // Derive from cards, then add deltas
      weights = deriveWeightsFromCards(kaCard, legacyCard, alignment);
      const deltas = this.config.weightOverride;
      for (const key of Object.keys(weights) as (keyof AIWeights)[]) {
        weights[key] += deltas[key] ?? 0;
      }
      // Re-clamp and normalize
      for (const key of Object.keys(weights) as (keyof AIWeights)[]) {
        weights[key] = Math.max(AI_CONFIG.minWeight, weights[key]);
      }
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      for (const key of Object.keys(weights) as (keyof AIWeights)[]) {
        weights[key] /= sum;
      }
      name = this.config.nameOverride ?? this.deriveName(weights);
    } else {
      // Normal mode: derive from cards
      weights = deriveWeightsFromCards(kaCard, legacyCard, alignment);
      name = this.deriveName(weights);
    }

    // Derive tactical preferences
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    let tacticalPreferences = {
      aggressionLevel: clamp(weights.military * AI_CONFIG.tacticalMultiplier, 0, 1),
      tradePreference: clamp(weights.economy * AI_CONFIG.tacticalMultiplier, 0, 1),
      expansionPreference: clamp(weights.territory * AI_CONFIG.tacticalMultiplier, 0, 1),
    };

    // Apply tactical overrides if present
    if (this.config.tacticalOverride) {
      tacticalPreferences = {
        ...tacticalPreferences,
        ...this.config.tacticalOverride,
      };
    }

    const description = `Derived from ${kaCard ?? "no KA card"} + ${
      legacyCard ? `${legacyCard.name} (${legacyCard.colour})` : "no legacy card"
    } [mode: ${mode}]`;

    this.personality = { name, weights, description, tacticalPreferences };

    // Log initialization
    const logger = getAILogger();
    if (logger.getVerbosity() !== "silent") {
      console.log(
        `[AI] Bot P${playerID} initialized as ${name} [mode: ${mode}] (KA: ${kaCard ?? "none"}, Legacy: ${legacyCard?.name ?? "none"}, Alignment: ${alignment})`
      );
      console.log(`[AI] Weights: ${JSON.stringify(weights, null, 0)}`);
    }
  }

  // --- Move selection ---

  chooseMove(G: MyGameState, ctx: Ctx, playerID: string): AIMove | null {
    const startTime = Date.now();

    // Lazy initialization: init personality when cards are known
    if (!this.personality) {
      const player = G.playerInfo[playerID];
      if (player?.resources.advantageCard) {
        this.initializePersonality(G, playerID);
      }
    }

    // Special handling for card-picking phases
    if (ctx.phase === "kingdom_advantage") {
      return this.chooseKACard(G, playerID);
    }
    if (ctx.phase === "legacy_card") {
      return this.chooseLegacyCard(G, playerID);
    }

    const personality = this.personality ?? this.defaultPersonality();

    // Check if a dedicated strategy is registered for this phase
    const strategy = this.registry.getStrategy(ctx.phase ?? "");
    const isRegisteredStrategy = !(strategy instanceof RandomFallbackStrategy);

    if (isRegisteredStrategy) {
      // If enumerate says nothing to do, don't call the strategy
      // (strategies return fallback moves like "pass" when empty, which may not exist)
      const availableMoves = enumerateLegalMoves(G, ctx, playerID);
      if (availableMoves.length === 0) return null;

      const chosen = strategy.selectMove(G, ctx, playerID, personality);
      this.logDecision(G, ctx, playerID, [chosen], chosen, 0, "best_score", startTime);
      return chosen;
    }

    // Default path: enumerate + score with estimateMoveValue
    const moves = enumerateLegalMoves(G, ctx, playerID);
    if (moves.length === 0) return null;
    if (moves.length === 1) {
      this.logDecision(G, ctx, playerID, moves, moves[0], 0, "forced", startTime);
      return moves[0];
    }

    const scored = moves.map((m) => ({
      move: m,
      score: estimateMoveValue(G, playerID, m, personality.weights),
    }));
    scored.sort((a, b) => b.score - a.score);

    const chosen = scored[0];
    this.logDecision(G, ctx, playerID, moves, chosen.move, chosen.score, "best_score", startTime);
    return chosen.move;
  }

  // --- Card-picking phases ---

  private chooseKACard(G: MyGameState, playerID: string): AIMove | null {
    const pool = G.cardDecks.kingdomAdvantagePool;
    if (pool.length === 0) return null;

    // Score each KA card: how strong of a strategic identity does it create?
    // We don't have a legacy card yet, so derive weights with kaCard only.
    const alignment = G.playerInfo[playerID].hereticOrOrthodox;
    let bestCard = pool[0];
    let bestMaxWeight = 0;

    for (const card of pool) {
      const weights = deriveWeightsFromCards(card, undefined, alignment);
      // Pick the card with the highest single-dimension weight (strongest identity)
      const maxWeight = Math.max(...Object.values(weights));
      if (maxWeight > bestMaxWeight) {
        bestMaxWeight = maxWeight;
        bestCard = card;
      }
    }

    return { move: "pickKingdomAdvantageCard", args: [bestCard] };
  }

  private chooseLegacyCard(G: MyGameState, playerID: string): AIMove | null {
    const options = G.playerInfo[playerID].legacyCardOptions;
    if (!options || options.length === 0) return null;

    const player = G.playerInfo[playerID];
    const kaCard = player.resources.advantageCard;
    const alignment = player.hereticOrOrthodox;

    // Score each legacy card by synergy with current KA card
    let bestCard = options[0];
    let bestMaxWeight = 0;

    for (const card of options) {
      const weights = deriveWeightsFromCards(kaCard, card, alignment);
      const maxWeight = Math.max(...Object.values(weights));
      if (maxWeight > bestMaxWeight) {
        bestMaxWeight = maxWeight;
        bestCard = card;
      }
    }

    const result: AIMove = { move: "pickLegacyCard", args: [bestCard] };

    // After picking legacy card, re-derive personality with both cards known
    // (This will happen on next chooseMove call via initializePersonality)
    // Force re-initialization by nulling personality
    this.personality = null;

    return result;
  }

  // --- Helpers ---

  private deriveName(weights: AIWeights): string {
    const nameMap: Record<string, string> = {
      military: "Conqueror",
      economy: "Merchant",
      religion: "Prelate",
      territory: "Empire Builder",
      legacy: "Legacy Hunter",
      positioning: "Admiral",
      threats: "Warden",
      republicAccess: "Diplomat",
    };
    const dominantKey = (Object.keys(weights) as (keyof AIWeights)[]).reduce(
      (a, b) => (weights[a] > weights[b] ? a : b)
    );
    return nameMap[dominantKey] ?? "Balanced";
  }

  private defaultPersonality(): AIPersonality {
    return {
      name: "Balanced",
      weights: { ...AI_CONFIG.defaultPersonality.weights },
      description: "Default balanced personality (no cards known yet)",
      tacticalPreferences: { ...AI_CONFIG.defaultPersonality.tacticalDefaults },
    };
  }

  private logDecision(
    G: MyGameState,
    ctx: Ctx,
    playerID: string,
    allMoves: AIMove[],
    chosen: AIMove,
    chosenScore: number,
    reason: "best_score" | "random_override" | "forced" | "fallback",
    startTime: number
  ): void {
    const personality = this.personality ?? this.defaultPersonality();
    const weights = personality.weights;

    // Score top 5 for logging
    const scored = allMoves
      .map((m) => ({
        move: m.move,
        args: m.args,
        score: estimateMoveValue(G, playerID, m, weights),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    getAILogger().logDecision({
      round: G.round,
      phase: ctx.phase ?? "unknown",
      stage: G.stage ? `${G.stage.phase}/${G.stage.sub}` : "unknown",
      playerID,
      personalityName: personality.name,
      legalMoveCount: allMoves.length,
      legalMoveNames: [...new Set(allMoves.map((m) => m.move))],
      topScoredMoves: scored,
      chosenMove: chosen.move,
      chosenArgs: chosen.args,
      chosenScore,
      reason,
      decisionTimeMs: Date.now() - startTime,
    });
  }

  // --- Static factory ---

  static createRegistry(): AIStrategyRegistry {
    const fallback = new RandomFallbackStrategy();
    const registry = new AIStrategyRegistry(fallback);
    registry.register("discovery", new DiscoveryStrategy());
    registry.register("events", new EventsStrategy());
    registry.register("actions", new ActionsStrategy());
    registry.register("aerial_battle", new AerialBattleStrategy());
    registry.register("ground_battle", new GroundBattleStrategy());
    registry.register("election", new ElectionStrategy());
    registry.register("conquest", new ConquestStrategy());
    registry.register("plunder_legends", new PlunderStrategy());
    registry.register("resolution", new ResolutionStrategy());
    return registry;
  }
}
