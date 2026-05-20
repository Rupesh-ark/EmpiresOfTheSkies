export type ResourceSnapshot = {
  gold: number;
  victoryPoints: number;
  counsellors: number;
  skyships: number;
  regiments: number;
  levies: number;
  eliteRegiments: number;
};

export type ScoredMove = {
  move: string;
  args: any[];
  score: number;
};

export type DecisionReason = "best_score" | "random_override" | "forced" | "fallback";

export type MCTSStats = {
  simulations: number;
  timeMs: number;
  children: { move: string; visits: number; avgReward: number; quality: number }[];
  overrodeEvaluator: boolean;
  evaluatorTopMove: string;
};

export type DecisionLogEntry = {
  type: "decision";
  round: number;
  phase: string;
  stage: string;
  playerID: string;
  personalityName: string;
  legalMoveCount: number;
  legalMoveNames: string[];
  topScoredMoves: ScoredMove[];
  chosenMove: string;
  chosenArgs: any[];
  chosenScore: number | undefined;
  reason: DecisionReason;
  decisionTimeMs: number;
  mctsStats?: MCTSStats;
};

export type TurnSummaryEntry = {
  type: "turn_summary";
  round: number;
  phase: string;
  playerID: string;
  personalityName: string;
  movesMade: string[];
  resourcesBefore: ResourceSnapshot;
  resourcesAfter: ResourceSnapshot;
  evalScoreBefore: number | undefined;
  evalScoreAfter: number | undefined;
};

export type RoundSummaryEntry = {
  type: "round_summary";
  round: number;
  standings: {
    playerID: string;
    personalityName: string;
    vp: number;
    territoryCount: number;
    militaryStrength: number;
    gold: number;
    evalScore: number | undefined;
  }[];
  leaderName: string;
  leaderMargin: number;
};

export type GameSummaryEntry = {
  type: "game_summary";
  winnerID: string;
  winnerPersonality: string;
  rankings: {
    rank: number;
    playerID: string;
    personalityName: string;
    vp: number;
  }[];
  totalDecisionsPerBot: Record<string, number>;
  avgDecisionTimePerBot: Record<string, number>;
  totalRounds: number;
  gameNumber: number | undefined;
};

export type AILogEntry =
  | DecisionLogEntry
  | TurnSummaryEntry
  | RoundSummaryEntry
  | GameSummaryEntry;

export class AILogger {
  private entries: AILogEntry[] = [];
  private onEntry: ((entry: AILogEntry) => void) | undefined;

  constructor(onEntry?: (entry: AILogEntry) => void) {
    this.onEntry = onEntry;
  }

  logDecision(entry: Omit<DecisionLogEntry, "type">): void {
    const full: DecisionLogEntry = { type: "decision", ...entry };
    this.entries.push(full);
    this.onEntry?.(full);
  }

  logTurnSummary(entry: Omit<TurnSummaryEntry, "type">): void {
    const full: TurnSummaryEntry = { type: "turn_summary", ...entry };
    this.entries.push(full);
    this.onEntry?.(full);
  }

  logRoundSummary(entry: Omit<RoundSummaryEntry, "type">): void {
    const full: RoundSummaryEntry = { type: "round_summary", ...entry };
    this.entries.push(full);
    this.onEntry?.(full);
  }

  logGameSummary(entry: Omit<GameSummaryEntry, "type">): void {
    const full: GameSummaryEntry = { type: "game_summary", ...entry };
    this.entries.push(full);
    this.onEntry?.(full);
  }

  getEntries(): readonly AILogEntry[] {
    return this.entries;
  }

  getDecisions(): readonly DecisionLogEntry[] {
    return this.entries.filter(
      (e): e is DecisionLogEntry => e.type === "decision"
    );
  }

  getRoundSummaries(): readonly RoundSummaryEntry[] {
    return this.entries.filter(
      (e): e is RoundSummaryEntry => e.type === "round_summary"
    );
  }

  getGameSummaries(): readonly GameSummaryEntry[] {
    return this.entries.filter(
      (e): e is GameSummaryEntry => e.type === "game_summary"
    );
  }

  toJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  clear(): void {
    this.entries = [];
  }
}

let activeLogger: AILogger = new AILogger();

export function getAILogger(): AILogger {
  return activeLogger;
}

export function setAILogger(logger: AILogger): void {
  activeLogger = logger;
}
