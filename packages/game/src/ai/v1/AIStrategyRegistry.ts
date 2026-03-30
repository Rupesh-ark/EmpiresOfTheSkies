/** @deprecated v1 scoring system — kept for non-actions phases. See ../evaluators/ for v2. */
import type { PhaseStrategy } from "../types";

export class AIStrategyRegistry {
  private strategies: Map<string, PhaseStrategy>;
  private fallback: PhaseStrategy;

  constructor(fallback: PhaseStrategy) {
    this.strategies = new Map();
    this.fallback = fallback;
  }

  register(phase: string, strategy: PhaseStrategy): void {
    this.strategies.set(phase, strategy);
  }

  getStrategy(phase: string): PhaseStrategy {
    return this.strategies.get(phase) ?? this.fallback;
  }
}
