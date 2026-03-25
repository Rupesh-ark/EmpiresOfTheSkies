export * from "./types";
export { AI_CONFIG } from "./weightsConfig";
export { AIStrategyRegistry } from "./AIStrategyRegistry";
export { RandomFallbackStrategy } from "./strategies/RandomFallback";
export { enumerateLegalMoves } from "./enumerate";
export {
  deriveWeightsFromCards,
  derivePersonalityFromGameState,
  reinitializeAfterLegacyPick,
  ALL_KA_CARDS_LIST,
  ALL_LEGACY_CARDS_LIST,
} from "./personalities";
export {
  AILogger,
  getAILogger,
  setAILogger,
} from "./AILogger";
export type {
  VerbosityLevel,
  ResourceSnapshot,
  ScoredMove,
  DecisionReason,
  DecisionLogEntry,
  TurnSummaryEntry,
  RoundSummaryEntry,
  GameSummaryEntry,
  AILogEntry,
} from "./AILogger";
export { evaluateState, estimateMoveValue } from "./evaluate";
export { EmpiresBot } from "./EmpiresBot";
export { runSelfPlay, runSingleGame, printBalanceReport } from "./selfPlay";
export type { GameResult, BalanceReport } from "./selfPlay";
export {
  runTournament,
  runHillClimb,
  runLeague,
  printTournamentResult,
  printHillClimbResult,
  printLeagueResult,
} from "./tournament";
export type {
  TournamentMatchup,
  TournamentResult,
  HillClimbConfig,
  HillClimbResult,
  LeagueConfig,
  LeagueResult,
} from "./tournament";
