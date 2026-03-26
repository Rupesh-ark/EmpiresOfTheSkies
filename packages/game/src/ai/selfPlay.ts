/**
 * selfPlay.ts — Headless game runner for balance testing.
 *
 * Runs complete games locally (no server, no WebSocket) using boardgame.io's
 * local Client. Each game creates 6 EmpiresBot instances that derive their
 * personalities from dealt cards.
 */
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../Game";
import type { MyGameState } from "../types";
import { EmpiresBot } from "./EmpiresBot";
import { AILogger, getAILogger, setAILogger } from "./AILogger";
import type { VerbosityLevel } from "./AILogger";

// ── Result types ────────────────────────────────────────────────────────────

export interface GameResult {
  gameNumber: number;
  winner: string;
  winnerPersonality: string;
  winnerKACard: string;
  winnerLegacyCard: string;
  scores: Record<string, number>;
  rounds: number;
  personalities: Record<string, string>;
  cardCombos: Record<string, { ka: string; legacy: string; vp: number }>;
}

export interface BalanceReport {
  totalGames: number;
  completedGames: number;
  winsByPersonality: Record<string, number>;
  winRateByPersonality: Record<string, number>;
  avgScoreByPersonality: Record<string, number>;
  avgScoreSpread: number;
  dominantStrategy: string | null;
  winRateByKACard: Record<string, number>;
  winRateByLegacyCard: Record<string, number>;
  bestCardCombo: { ka: string; legacy: string; winRate: number; games: number } | null;
  worstCardCombo: { ka: string; legacy: string; winRate: number; games: number } | null;
}

// ── Shared game loop ─────────────────────────────────────────────────────────

/**
 * Runs the boardgame.io local client loop until gameover or maxIterations.
 * Handles both activePlayers (simultaneous) and sequential turns.
 * When a bot has nothing to do (enumerate returns []), it skips — matching
 * the live game behavior (setupBotClients.ts does nothing on null moves).
 * Stops all clients before returning.
 */
export function runGameLoop(
  clients: ReturnType<typeof Client>[],
  bots: EmpiresBot[],
  maxIterations = 50000
): { finalState: any; iterations: number } {
  let iterations = 0;

  while (iterations < maxIterations) {
    const state = clients[0].getState();
    if (!state || state.ctx.gameover) break;

    const ctx = state.ctx;

    // Handle activePlayers (election — all players act simultaneously)
    if (ctx.activePlayers) {
      for (const [pid] of Object.entries(ctx.activePlayers)) {
        const pIdx = parseInt(pid);
        const botState = clients[pIdx].getState();
        if (!botState) continue;
        const move = bots[pIdx].chooseMove(botState.G as MyGameState, botState.ctx, pid);
        if (move) {
          (clients[pIdx] as any).moves[move.move]?.(...move.args);
        }
      }
    } else {
      // Sequential turn: current player acts
      const currentPlayer = ctx.currentPlayer;
      const pIdx = parseInt(currentPlayer);
      const botState = clients[pIdx].getState();
      if (!botState) { iterations++; continue; }

      const move = bots[pIdx].chooseMove(botState.G as MyGameState, botState.ctx, currentPlayer);
      if (move) {
        (clients[pIdx] as any).moves[move.move]?.(...move.args);
      }
      // null move → skip. EmpiresBot returns null when enumerate has no valid moves.
    }

    iterations++;

    // Diagnostic: detect stalls — log every 100 iterations
    if (iterations % 100 === 0) {
      const s = clients[0].getState();
      if (s) {
        const G = s.G as MyGameState;
        console.log(`[DIAG] iter=${iterations} R${G.round} phase=${s.ctx.phase} stage=${G.stage} turn=${s.ctx.turn} P${s.ctx.currentPlayer} halted=${G._halted}`);
      }
    }
    // Hard exit if way too many iterations
    if (iterations >= 49000) {
      const s = clients[0].getState();
      if (s) {
        const G = s.G as MyGameState;
        console.log(`[STUCK] iter=${iterations} R${G.round} phase=${s.ctx.phase} stage=${G.stage} turn=${s.ctx.turn} P${s.ctx.currentPlayer}`);
      }
      break;
    }
  }

  const finalState = clients[0].getState();
  for (const c of clients) c.stop();

  return { finalState, iterations };
}

// ── Single game runner ──────────────────────────────────────────────────────

export function runSingleGame(gameNumber: number): GameResult | null {
  // Create 6 local clients sharing the same match via Local multiplayer
  const clients: ReturnType<typeof Client>[] = [];
  const bots: EmpiresBot[] = [];

  for (let p = 0; p < 6; p++) {
    const playerID = String(p);
    const bot = new EmpiresBot({ playerID });
    bots.push(bot);

    const client = Client({
      game: MyGame,
      numPlayers: 6,
      multiplayer: Local(),
      playerID,
    });
    client.start();
    clients.push(client);
  }

  const { finalState, iterations } = runGameLoop(clients, bots);

  if (!finalState?.ctx.gameover) {
    console.warn(`Game ${gameNumber}: did not complete (${iterations} iterations)`);
    return null;
  }

  return extractResult(finalState, bots, gameNumber);
}

// ── Result extraction ───────────────────────────────────────────────────────

function extractResult(state: any, bots: EmpiresBot[], gameNumber: number): GameResult {
  const G = state.G as MyGameState;
  const ranking: string[] = state.ctx.gameover?.ranking ?? [];
  const winnerID = ranking[0] ?? "0";

  const scores: Record<string, number> = {};
  const personalities: Record<string, string> = {};
  const cardCombos: Record<string, { ka: string; legacy: string; vp: number }> = {};

  for (const [pid, player] of Object.entries(G.playerInfo)) {
    scores[pid] = player.resources.victoryPoints;
    const bot = bots[parseInt(pid)];
    const personality = bot.getPersonality();
    personalities[pid] = personality?.name ?? "Unknown";
    cardCombos[pid] = {
      ka: player.resources.advantageCard ?? "none",
      legacy: player.resources.legacyCard?.name ?? "none",
      vp: player.resources.victoryPoints,
    };
  }

  const winner = G.playerInfo[winnerID];
  const winnerBot = bots[parseInt(winnerID)];

  return {
    gameNumber,
    winner: winnerID,
    winnerPersonality: winnerBot.getPersonality()?.name ?? "Unknown",
    winnerKACard: winner?.resources.advantageCard ?? "none",
    winnerLegacyCard: winner?.resources.legacyCard?.name ?? "none",
    scores,
    rounds: G.round,
    personalities,
    cardCombos,
  };
}

// ── Batch runner ────────────────────────────────────────────────────────────

export function runSelfPlay(
  numGames: number,
  verbosity: VerbosityLevel = "silent"
): BalanceReport {
  // Set up logger for the batch
  const logger = new AILogger(verbosity);
  setAILogger(logger);

  const results: GameResult[] = [];

  for (let i = 0; i < numGames; i++) {
    if (verbosity !== "silent" && i % 10 === 0) {
      console.log(`Running game ${i + 1}/${numGames}...`);
    }

    const result = runSingleGame(i + 1);
    if (result) {
      results.push(result);

      if (verbosity !== "silent") {
        console.log(
          `  Game ${i + 1}: Winner P${result.winner} (${result.winnerPersonality}) — ${result.winnerKACard} + ${result.winnerLegacyCard} — ${result.scores[result.winner]} VP`
        );
      }
    }

    // Clear logger between games to prevent memory growth
    logger.clear();
  }

  // Restore default logger
  setAILogger(new AILogger("summary"));

  return analyzeBalance(results, numGames);
}

// ── Balance analysis ────────────────────────────────────────────────────────

function analyzeBalance(results: GameResult[], totalGames: number): BalanceReport {
  const winsByPersonality: Record<string, number> = {};
  const scoresByPersonality: Record<string, number[]> = {};
  const winsByKA: Record<string, number> = {};
  const gamesByKA: Record<string, number> = {};
  const winsByLegacy: Record<string, number> = {};
  const gamesByLegacy: Record<string, number> = {};
  const comboWins: Record<string, number> = {};
  const comboGames: Record<string, number> = {};
  const scoreSpread: number[] = [];

  for (const r of results) {
    // Personality stats
    const wp = r.winnerPersonality;
    winsByPersonality[wp] = (winsByPersonality[wp] ?? 0) + 1;

    for (const [pid, personality] of Object.entries(r.personalities)) {
      if (!scoresByPersonality[personality]) scoresByPersonality[personality] = [];
      scoresByPersonality[personality].push(r.scores[pid]);
    }

    // KA card stats
    winsByKA[r.winnerKACard] = (winsByKA[r.winnerKACard] ?? 0) + 1;
    for (const combo of Object.values(r.cardCombos)) {
      gamesByKA[combo.ka] = (gamesByKA[combo.ka] ?? 0) + 1;
    }

    // Legacy card stats
    winsByLegacy[r.winnerLegacyCard] = (winsByLegacy[r.winnerLegacyCard] ?? 0) + 1;
    for (const combo of Object.values(r.cardCombos)) {
      gamesByLegacy[combo.legacy] = (gamesByLegacy[combo.legacy] ?? 0) + 1;
    }

    // Card combo stats
    for (const [pid, combo] of Object.entries(r.cardCombos)) {
      const key = `${combo.ka}+${combo.legacy}`;
      comboGames[key] = (comboGames[key] ?? 0) + 1;
      if (pid === r.winner) {
        comboWins[key] = (comboWins[key] ?? 0) + 1;
      }
    }

    // Score spread
    const allScores = Object.values(r.scores);
    const maxScore = Math.max(...allScores);
    const minScore = Math.min(...allScores);
    scoreSpread.push(maxScore - minScore);
  }

  // Compute rates
  const completedGames = results.length;

  const winRateByPersonality: Record<string, number> = {};
  for (const [p, wins] of Object.entries(winsByPersonality)) {
    winRateByPersonality[p] = completedGames > 0 ? wins / completedGames : 0;
  }

  const avgScoreByPersonality: Record<string, number> = {};
  for (const [p, scores] of Object.entries(scoresByPersonality)) {
    avgScoreByPersonality[p] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  const winRateByKACard: Record<string, number> = {};
  for (const [ka, wins] of Object.entries(winsByKA)) {
    const games = gamesByKA[ka] ?? 1;
    winRateByKACard[ka] = wins / games;
  }

  const winRateByLegacyCard: Record<string, number> = {};
  for (const [legacy, wins] of Object.entries(winsByLegacy)) {
    const games = gamesByLegacy[legacy] ?? 1;
    winRateByLegacyCard[legacy] = wins / games;
  }

  // Find best/worst combos (min 3 games to be significant)
  let bestCombo: BalanceReport["bestCardCombo"] = null;
  let worstCombo: BalanceReport["worstCardCombo"] = null;

  for (const [key, games] of Object.entries(comboGames)) {
    if (games < 3) continue;
    const wins = comboWins[key] ?? 0;
    const rate = wins / games;
    const [ka, legacy] = key.split("+");

    if (!bestCombo || rate > bestCombo.winRate) {
      bestCombo = { ka, legacy, winRate: rate, games };
    }
    if (!worstCombo || rate < worstCombo.winRate) {
      worstCombo = { ka, legacy, winRate: rate, games };
    }
  }

  const avgScoreSpread = scoreSpread.length > 0
    ? scoreSpread.reduce((a, b) => a + b, 0) / scoreSpread.length
    : 0;

  // Detect dominant strategy (>25% win rate)
  let dominantStrategy: string | null = null;
  for (const [p, rate] of Object.entries(winRateByPersonality)) {
    if (rate > 0.25) {
      dominantStrategy = p;
      break;
    }
  }

  return {
    totalGames,
    completedGames,
    winsByPersonality,
    winRateByPersonality,
    avgScoreByPersonality,
    avgScoreSpread,
    dominantStrategy,
    winRateByKACard,
    winRateByLegacyCard,
    bestCardCombo: bestCombo,
    worstCardCombo: worstCombo,
  };
}

// ── Report formatter ────────────────────────────────────────────────────────

export function printBalanceReport(report: BalanceReport): void {
  console.log("\n" + "═".repeat(70));
  console.log("  BALANCE REPORT");
  console.log("═".repeat(70));
  console.log(`  Games: ${report.completedGames}/${report.totalGames} completed`);
  console.log(`  Avg score spread (1st - last): ${report.avgScoreSpread.toFixed(1)} VP`);
  if (report.dominantStrategy) {
    console.log(`  ⚠ DOMINANT STRATEGY: ${report.dominantStrategy} (>25% win rate)`);
  }

  console.log("\n" + "─".repeat(70));
  console.log("  WIN RATES BY PERSONALITY");
  console.log("─".repeat(70));
  const sorted = Object.entries(report.winRateByPersonality).sort((a, b) => b[1] - a[1]);
  for (const [name, rate] of sorted) {
    const wins = report.winsByPersonality[name] ?? 0;
    const avg = report.avgScoreByPersonality[name]?.toFixed(1) ?? "?";
    const bar = "█".repeat(Math.round(rate * 50));
    console.log(`  ${name.padEnd(16)} ${(rate * 100).toFixed(1).padStart(5)}% (${String(wins).padStart(3)} wins) avg ${avg.padStart(5)} VP  ${bar}`);
  }

  console.log("\n" + "─".repeat(70));
  console.log("  WIN RATES BY KA CARD");
  console.log("─".repeat(70));
  const kaSorted = Object.entries(report.winRateByKACard).sort((a, b) => b[1] - a[1]);
  for (const [ka, rate] of kaSorted) {
    console.log(`  ${ka.padEnd(28)} ${(rate * 100).toFixed(1).padStart(5)}%`);
  }

  console.log("\n" + "─".repeat(70));
  console.log("  WIN RATES BY LEGACY CARD");
  console.log("─".repeat(70));
  const legacySorted = Object.entries(report.winRateByLegacyCard).sort((a, b) => b[1] - a[1]);
  for (const [legacy, rate] of legacySorted) {
    console.log(`  ${legacy.padEnd(20)} ${(rate * 100).toFixed(1).padStart(5)}%`);
  }

  if (report.bestCardCombo) {
    console.log("\n" + "─".repeat(70));
    console.log("  CARD COMBOS");
    console.log("─".repeat(70));
    const b = report.bestCardCombo;
    console.log(`  Best:  ${b.ka} + ${b.legacy} → ${(b.winRate * 100).toFixed(1)}% (${b.games} games)`);
    if (report.worstCardCombo) {
      const w = report.worstCardCombo;
      console.log(`  Worst: ${w.ka} + ${w.legacy} → ${(w.winRate * 100).toFixed(1)}% (${w.games} games)`);
    }
  }

  console.log("═".repeat(70) + "\n");
}
