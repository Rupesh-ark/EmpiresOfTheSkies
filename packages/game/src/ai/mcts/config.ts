/**
 * MCTS Configuration
 */
export interface MCTSModeConfig {
  simulationsPerMove: number;
  rolloutDepth: number;
  explorationConstant: number;
}

export const MCTS_CONFIG: Record<"fast" | "play", MCTSModeConfig> = {
  fast: {
    simulationsPerMove: 60,
    rolloutDepth: 6,
    explorationConstant: 1.4,
  },

  play: {
    simulationsPerMove: 1000,
    rolloutDepth: 4,
    explorationConstant: 1.4,
  },
};

/** Override the "fast" config at runtime (used by AI Tuner UI) */
export function setMCTSConfig(overrides: Partial<MCTSModeConfig>): void {
  Object.assign(MCTS_CONFIG.fast, overrides);
}

/** Reset "fast" config to defaults */
export function resetMCTSConfig(): void {
  MCTS_CONFIG.fast.simulationsPerMove = 20;
  MCTS_CONFIG.fast.rolloutDepth = 1;
  MCTS_CONFIG.fast.explorationConstant = 1.4;
}
