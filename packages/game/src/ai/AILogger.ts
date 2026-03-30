// AILogger.ts — structured decision logging for AI bots.
// This is intentionally separate from the game's createLogger (helpers/logger.ts),
// which logs server-side game events. AILogger tracks bot decision-making metadata
// (scored moves, personalities, timing) for debugging and batch-run analysis.

export type VerbosityLevel = "silent" | "summary" | "decisions" | "verbose";

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
  private verbosity: VerbosityLevel;
  private onEntry: ((entry: AILogEntry) => void) | undefined;

  constructor(
    verbosity: VerbosityLevel = "summary",
    onEntry?: (entry: AILogEntry) => void
  ) {
    this.verbosity = verbosity;
    this.onEntry = onEntry;
  }

  setVerbosity(level: VerbosityLevel): void {
    this.verbosity = level;
  }

  getVerbosity(): VerbosityLevel {
    return this.verbosity;
  }

  logDecision(entry: Omit<DecisionLogEntry, "type">): void {
    const full: DecisionLogEntry = { type: "decision", ...entry };
    this.entries.push(full);
    this.onEntry?.(full);

    if (this.verbosity === "decisions" || this.verbosity === "verbose") {
      this.printDecision(full);
    }
  }

  logTurnSummary(entry: Omit<TurnSummaryEntry, "type">): void {
    const full: TurnSummaryEntry = { type: "turn_summary", ...entry };
    this.entries.push(full);
    this.onEntry?.(full);

    if (this.verbosity === "verbose") {
      this.printTurnSummary(full);
    }
  }

  logRoundSummary(entry: Omit<RoundSummaryEntry, "type">): void {
    const full: RoundSummaryEntry = { type: "round_summary", ...entry };
    this.entries.push(full);
    this.onEntry?.(full);

    if (
      this.verbosity === "summary" ||
      this.verbosity === "decisions" ||
      this.verbosity === "verbose"
    ) {
      this.printRoundSummary(full);
    }
  }

  logGameSummary(entry: Omit<GameSummaryEntry, "type">): void {
    const full: GameSummaryEntry = { type: "game_summary", ...entry };
    this.entries.push(full);
    this.onEntry?.(full);

    if (this.verbosity !== "silent") {
      this.printGameSummary(full);
    }
  }

  // --- Getters ---

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

  // --- Console formatters ---

  private printDecision(d: DecisionLogEntry): void {
    const topCount = this.verbosity === "verbose" ? 5 : 3;
    const topMoves = d.topScoredMoves
      .slice(0, topCount)
      .map((m) => `${m.move}(${m.score.toFixed(2)})`)
      .join(", ");

    const scoreStr =
      d.chosenScore !== undefined ? d.chosenScore.toFixed(2) : "?";

    console.log(
      `[AI:${d.personalityName}] P${d.playerID} ${d.phase}/${d.stage} → ${d.chosenMove} (${scoreStr}, ${d.reason}) [${d.legalMoveCount} legal, top: ${topMoves}] ${d.decisionTimeMs}ms`
    );
  }

  private printTurnSummary(t: TurnSummaryEntry): void {
    const moves = t.movesMade.join(", ") || "(none)";
    const goldDelta = t.resourcesAfter.gold - t.resourcesBefore.gold;
    const vpDelta =
      t.resourcesAfter.victoryPoints - t.resourcesBefore.victoryPoints;
    const goldSign = goldDelta >= 0 ? "+" : "";
    const vpSign = vpDelta >= 0 ? "+" : "";

    console.log(
      `  [Turn] P${t.playerID} (${t.personalityName}) ${t.phase}: ${moves} | gold: ${goldSign}${goldDelta} → ${t.resourcesAfter.gold}, VP: ${vpSign}${vpDelta} → ${t.resourcesAfter.victoryPoints}`
    );
  }

  private printRoundSummary(r: RoundSummaryEntry): void {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ROUND ${r.round} STANDINGS`);
    console.log(`${"─".repeat(60)}`);
    console.log(
      `  ${"Player".padEnd(8)} ${"Personality".padEnd(16)} ${"VP".padStart(4)} ${"Gold".padStart(6)} ${"Mil".padStart(5)} ${"Terr".padStart(5)}`
    );
    console.log(`  ${"─".repeat(52)}`);

    for (const s of r.standings) {
      console.log(
        `  P${s.playerID.padEnd(7)} ${s.personalityName.padEnd(16)} ${String(s.vp).padStart(4)} ${String(s.gold).padStart(6)} ${String(s.militaryStrength).padStart(5)} ${String(s.territoryCount).padStart(5)}`
      );
    }

    console.log(`  ${"─".repeat(52)}`);
    console.log(`  Leader: ${r.leaderName} (+${r.leaderMargin} VP)`);
    console.log(`${"═".repeat(60)}\n`);
  }

  private printGameSummary(g: GameSummaryEntry): void {
    const gameLabel =
      g.gameNumber !== undefined ? ` (Game #${g.gameNumber})` : "";
    console.log(`\n${"╔".padEnd(59, "═")}╗`);
    console.log(`${"║".padEnd(2)}GAME OVER${gameLabel.padEnd(49)}║`);
    console.log(`${"╠".padEnd(59, "═")}╣`);

    for (const r of g.rankings) {
      const marker = r.rank === 1 ? " ★" : "  ";
      const avgTime = g.avgDecisionTimePerBot[r.playerID]?.toFixed(1) ?? "?";
      const decisions = g.totalDecisionsPerBot[r.playerID] ?? 0;
      console.log(
        `║${marker} #${r.rank} P${r.playerID} (${r.personalityName.padEnd(14)}) ${String(r.vp).padStart(3)} VP | ${String(decisions).padStart(4)} moves, avg ${avgTime.padStart(5)}ms ║`
      );
    }

    console.log(`${"╠".padEnd(59, "═")}╣`);
    console.log(
      `║  Winner: P${g.winnerID} (${g.winnerPersonality})${"".padEnd(Math.max(0, 36 - g.winnerPersonality.length))}║`
    );
    console.log(
      `║  Rounds: ${g.totalRounds}${"".padEnd(47 - String(g.totalRounds).length)}║`
    );
    console.log(`${"╚".padEnd(59, "═")}╝\n`);
  }
}

// --- Singleton ---

let _logger: AILogger = new AILogger("summary");

export function getAILogger(): AILogger {
  return _logger;
}

export function setAILogger(logger: AILogger): void {
  _logger = logger;
}
