/**
 * tournament.ts — Structured tournament modes for weight optimization.
 *
 * Three modes:
 * 1. A/B Test: pit specific weight sets against each other
 * 2. Hill Climb: auto-tune weights via coordinate ascent
 * 3. League: round-robin between multiple weight configurations
 */
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../Game";
import type { MyGameState } from "../types";
import type { AIWeights } from "./types";
import { EmpiresBot } from "./EmpiresBot";
import { AILogger, setAILogger } from "./AILogger";
import { runGameLoop } from "./selfPlay";
import { GameRecorder } from "./GameRecorder";

export interface TournamentMatchup {
  name: string;
  weightSets: Array<{ name: string; weights: AIWeights }>;
  gamesPerMatchup: number;
}

export interface TournamentResult {
  matchupName: string;
  weightSetResults: Array<{
    name: string;
    weights: AIWeights;
    gamesPlayed: number;
    wins: number;
    winRate: number;
    avgVP: number;
    avgFinishPosition: number;
    avgMercyReceived: number;
  }>;
  bestWeightSet: string;
  confidenceLevel: number;
}

export interface HillClimbConfig {
  baseWeights: AIWeights;
  dimensions: (keyof AIWeights)[];
  stepSize: number;
  gamesPerStep: number;
  maxIterations: number;
}

export interface HillClimbResult {
  startingWeights: AIWeights;
  finalWeights: AIWeights;
  improvementHistory: Array<{
    iteration: number;
    weights: AIWeights;
    winRate: number;
    avgVP: number;
  }>;
  totalGamesPlayed: number;
}

export interface LeagueConfig {
  entries: Array<{ name: string; weights: AIWeights }>;
  gamesPerPairing: number;
}

export interface LeagueResult {
  standings: Array<{
    name: string;
    weights: AIWeights;
    totalWins: number;
    totalGames: number;
    winRate: number;
    avgVP: number;
    headToHead: Record<string, { wins: number; losses: number }>;
  }>;
}

// Core: run a single game with specific bot configs

interface BotSlotConfig {
  playerID: string;
  name: string;
  weightOverride?: AIWeights;
  useCardDerived: boolean;  // true = normal card-derived, false = use weightOverride
}

function runConfiguredGame(slots: BotSlotConfig[]): {
  winner: string;
  scores: Record<string, number>;
  positions: Record<string, number>;
  mercyReceived: Record<string, number>;
} | null {
  const clients: ReturnType<typeof Client>[] = [];
  const bots: EmpiresBot[] = [];

  for (const slot of slots) {
    const bot = new EmpiresBot({
      playerID: slot.playerID,
      ...(slot.useCardDerived ? {} : {
        weightOverride: slot.weightOverride,
        weightOverrideMode: "full_override" as const,
        nameOverride: slot.name,
      }),
    });
    bots.push(bot);

    const client = Client({
      game: MyGame,
      numPlayers: 6,
      multiplayer: Local(),
      playerID: slot.playerID,
    });
    client.start();
    clients.push(client);
  }

  const { finalState } = runGameLoop(clients, bots, new GameRecorder());

  if (!finalState?.ctx.gameover) return null;

  const G = finalState.G as MyGameState;
  const ranking: string[] = finalState.ctx.gameover.ranking ?? [];
  const scores: Record<string, number> = {};
  const positions: Record<string, number> = {};
  const mercyReceived: Record<string, number> = {};

  for (const [pid, player] of Object.entries(G.playerInfo)) {
    scores[pid] = player.resources.victoryPoints;
    positions[pid] = ranking.indexOf(pid) + 1;
    mercyReceived[pid] = G.mercyGold[pid] ?? 0;
  }

  return { winner: ranking[0], scores, positions, mercyReceived };
}

// Mode 1: A/B Test

export function runTournament(matchup: TournamentMatchup): TournamentResult {
  setAILogger(new AILogger("silent"));

  const numSets = matchup.weightSets.length;
  const stats: Record<string, {
    wins: number; games: number; vpTotal: number;
    posTotal: number; mercyTotal: number;
  }> = {};

  for (const ws of matchup.weightSets) {
    stats[ws.name] = { wins: 0, games: 0, vpTotal: 0, posTotal: 0, mercyTotal: 0 };
  }

  for (let g = 0; g < matchup.gamesPerMatchup; g++) {
    // Rotate weight set assignments across player positions
    const slots: BotSlotConfig[] = [];
    for (let p = 0; p < 6; p++) {
      if (p < numSets) {
        // Rotate: in game g, weight set i plays in position (i + g) % 6
        const wsIdx = (p + g) % numSets;
        const ws = matchup.weightSets[wsIdx % numSets];
        slots.push({
          playerID: String(p),
          name: ws.name,
          weightOverride: ws.weights,
          useCardDerived: false,
        });
      } else {
        // Fill remaining seats with card-derived bots
        slots.push({
          playerID: String(p),
          name: `CardBot_${p}`,
          useCardDerived: true,
        });
      }
    }

    const result = runConfiguredGame(slots);
    if (!result) continue;

    // Record stats for each weight-set bot
    for (let p = 0; p < Math.min(6, numSets); p++) {
      const wsIdx = (p + g) % numSets;
      const ws = matchup.weightSets[wsIdx % numSets];
      const pid = String(p);
      const s = stats[ws.name];
      s.games++;
      s.vpTotal += result.scores[pid] ?? 0;
      s.posTotal += result.positions[pid] ?? 6;
      s.mercyTotal += result.mercyReceived[pid] ?? 0;
      if (result.winner === pid) s.wins++;
    }
  }

  // Compute results
  const weightSetResults = matchup.weightSets.map((ws) => {
    const s = stats[ws.name];
    return {
      name: ws.name,
      weights: ws.weights,
      gamesPlayed: s.games,
      wins: s.wins,
      winRate: s.games > 0 ? s.wins / s.games : 0,
      avgVP: s.games > 0 ? s.vpTotal / s.games : 0,
      avgFinishPosition: s.games > 0 ? s.posTotal / s.games : 6,
      avgMercyReceived: s.games > 0 ? s.mercyTotal / s.games : 0,
    };
  });

  weightSetResults.sort((a, b) => b.winRate - a.winRate);
  const bestWeightSet = weightSetResults[0]?.name ?? "none";

  // Binomial proportion confidence test (z-test approximation)
  let confidenceLevel = 0;
  if (weightSetResults.length >= 2) {
    const a = weightSetResults[0];
    const b = weightSetResults[1];
    if (a.gamesPlayed > 0 && b.gamesPlayed > 0) {
      const p1 = a.winRate;
      const p2 = b.winRate;
      const n1 = a.gamesPlayed;
      const n2 = b.gamesPlayed;
      const pPool = (a.wins + b.wins) / (n1 + n2);
      const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
      if (se > 0) {
        const z = Math.abs(p1 - p2) / se;
        // Approximate p-value from z-score
        confidenceLevel = 1 - 0.5 * Math.exp(-0.717 * z - 0.416 * z * z);
      }
    }
  }

  setAILogger(new AILogger("summary"));

  return { matchupName: matchup.name, weightSetResults, bestWeightSet, confidenceLevel };
}

// Mode 2: Hill Climb

export function runHillClimb(config: HillClimbConfig): HillClimbResult {
  setAILogger(new AILogger("silent"));

  let current = normalizeWeights({ ...config.baseWeights });
  let stepSize = config.stepSize;
  let totalGames = 0;
  const history: HillClimbResult["improvementHistory"] = [];

  // Evaluate starting weights
  const startEval = evaluateWeightSet(current, config.gamesPerStep);
  totalGames += config.gamesPerStep;
  let currentWinRate = startEval.winRate;
  let currentAvgVP = startEval.avgVP;

  history.push({
    iteration: 0,
    weights: { ...current },
    winRate: currentWinRate,
    avgVP: currentAvgVP,
  });

  console.log(`Hill climb start: winRate=${(currentWinRate * 100).toFixed(1)}% avgVP=${currentAvgVP.toFixed(1)} step=${stepSize}`);

  for (let iter = 1; iter <= config.maxIterations; iter++) {
    if (stepSize < 0.005) {
      console.log(`Step size too small (${stepSize.toFixed(4)}), stopping`);
      break;
    }

    let improved = false;
    let bestCandidate = current;
    let bestWinRate = currentWinRate;
    let bestAvgVP = currentAvgVP;

    for (const dim of config.dimensions) {
      // Try increasing this dimension
      const upCandidate = { ...current };
      upCandidate[dim] += stepSize;
      const upNorm = normalizeWeights(upCandidate);
      const upEval = evaluateWeightSet(upNorm, config.gamesPerStep);
      totalGames += config.gamesPerStep;

      if (upEval.winRate > bestWinRate || (upEval.winRate === bestWinRate && upEval.avgVP > bestAvgVP)) {
        bestWinRate = upEval.winRate;
        bestAvgVP = upEval.avgVP;
        bestCandidate = upNorm;
        improved = true;
      }

      // Try decreasing this dimension
      const downCandidate = { ...current };
      downCandidate[dim] = Math.max(0.01, downCandidate[dim] - stepSize);
      const downNorm = normalizeWeights(downCandidate);
      const downEval = evaluateWeightSet(downNorm, config.gamesPerStep);
      totalGames += config.gamesPerStep;

      if (downEval.winRate > bestWinRate || (downEval.winRate === bestWinRate && downEval.avgVP > bestAvgVP)) {
        bestWinRate = downEval.winRate;
        bestAvgVP = downEval.avgVP;
        bestCandidate = downNorm;
        improved = true;
      }
    }

    if (improved) {
      current = bestCandidate;
      currentWinRate = bestWinRate;
      currentAvgVP = bestAvgVP;
    } else {
      stepSize /= 2;
    }

    history.push({
      iteration: iter,
      weights: { ...current },
      winRate: currentWinRate,
      avgVP: currentAvgVP,
    });

    console.log(
      `  Iter ${iter}: winRate=${(currentWinRate * 100).toFixed(1)}% avgVP=${currentAvgVP.toFixed(1)} step=${stepSize.toFixed(4)} ${improved ? "improved" : "shrink"}`
    );
  }

  setAILogger(new AILogger("summary"));

  return {
    startingWeights: { ...config.baseWeights },
    finalWeights: current,
    improvementHistory: history,
    totalGamesPlayed: totalGames,
  };
}

function evaluateWeightSet(weights: AIWeights, numGames: number): { winRate: number; avgVP: number } {
  let wins = 0;
  let vpTotal = 0;
  let gamesCompleted = 0;

  for (let g = 0; g < numGames; g++) {
    // The test weight set always plays as player 0
    const slots: BotSlotConfig[] = [
      { playerID: "0", name: "Candidate", weightOverride: weights, useCardDerived: false },
    ];
    for (let p = 1; p < 6; p++) {
      slots.push({ playerID: String(p), name: `CardBot_${p}`, useCardDerived: true });
    }

    const result = runConfiguredGame(slots);
    if (!result) continue;

    gamesCompleted++;
    vpTotal += result.scores["0"] ?? 0;
    if (result.winner === "0") wins++;
  }

  return {
    winRate: gamesCompleted > 0 ? wins / gamesCompleted : 0,
    avgVP: gamesCompleted > 0 ? vpTotal / gamesCompleted : 0,
  };
}

// Mode 3: League

export function runLeague(config: LeagueConfig): LeagueResult {
  setAILogger(new AILogger("silent"));

  const { entries, gamesPerPairing } = config;

  // Initialize standings
  const standingsMap: Record<string, {
    name: string; weights: AIWeights;
    wins: number; games: number; vpTotal: number;
    headToHead: Record<string, { wins: number; losses: number }>;
  }> = {};

  for (const e of entries) {
    standingsMap[e.name] = {
      name: e.name,
      weights: e.weights,
      wins: 0,
      games: 0,
      vpTotal: 0,
      headToHead: {},
    };
    for (const other of entries) {
      if (other.name !== e.name) {
        standingsMap[e.name].headToHead[other.name] = { wins: 0, losses: 0 };
      }
    }
  }

  // Round-robin: every pair
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];

      console.log(`  ${a.name} vs ${b.name} (${gamesPerPairing} games)...`);

      for (let g = 0; g < gamesPerPairing; g++) {
        // A plays slot 0, B plays slot 1, rest are card-derived
        const slots: BotSlotConfig[] = [
          { playerID: "0", name: a.name, weightOverride: a.weights, useCardDerived: false },
          { playerID: "1", name: b.name, weightOverride: b.weights, useCardDerived: false },
        ];
        for (let p = 2; p < 6; p++) {
          slots.push({ playerID: String(p), name: `CardBot_${p}`, useCardDerived: true });
        }

        const result = runConfiguredGame(slots);
        if (!result) continue;

        // Update A
        standingsMap[a.name].games++;
        standingsMap[a.name].vpTotal += result.scores["0"] ?? 0;
        if (result.winner === "0") {
          standingsMap[a.name].wins++;
          standingsMap[a.name].headToHead[b.name].wins++;
          standingsMap[b.name].headToHead[a.name].losses++;
        }

        // Update B
        standingsMap[b.name].games++;
        standingsMap[b.name].vpTotal += result.scores["1"] ?? 0;
        if (result.winner === "1") {
          standingsMap[b.name].wins++;
          standingsMap[b.name].headToHead[a.name].wins++;
          standingsMap[a.name].headToHead[b.name].losses++;
        }
      }
    }
  }

  setAILogger(new AILogger("summary"));

  const standings = Object.values(standingsMap)
    .map((s) => ({
      ...s,
      winRate: s.games > 0 ? s.wins / s.games : 0,
      avgVP: s.games > 0 ? s.vpTotal / s.games : 0,
      totalWins: s.wins,
      totalGames: s.games,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  return { standings };
}

function normalizeWeights(w: AIWeights): AIWeights {
  const result = { ...w };
  for (const key of Object.keys(result) as (keyof AIWeights)[]) {
    result[key] = Math.max(0.01, result[key]);
  }
  const sum = Object.values(result).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(result) as (keyof AIWeights)[]) {
    result[key] /= sum;
  }
  return result;
}

// Report formatters

export function printTournamentResult(result: TournamentResult): void {
  console.log("\n" + "═".repeat(70));
  console.log(`  A/B TEST: ${result.matchupName}`);
  console.log("═".repeat(70));
  console.log(`  Confidence: ${(result.confidenceLevel * 100).toFixed(1)}%`);
  console.log(`  Winner: ${result.bestWeightSet}`);
  console.log("\n" + "─".repeat(70));
  console.log(`  ${"Config".padEnd(20)} ${"Win%".padStart(6)} ${"Wins".padStart(5)} ${"Games".padStart(6)} ${"AvgVP".padStart(6)} ${"AvgPos".padStart(7)} ${"Mercy".padStart(6)}`);
  console.log("  " + "─".repeat(62));

  for (const r of result.weightSetResults) {
    console.log(
      `  ${r.name.padEnd(20)} ${(r.winRate * 100).toFixed(1).padStart(5)}% ${String(r.wins).padStart(5)} ${String(r.gamesPlayed).padStart(6)} ${r.avgVP.toFixed(1).padStart(6)} ${r.avgFinishPosition.toFixed(2).padStart(7)} ${r.avgMercyReceived.toFixed(1).padStart(6)}`
    );
  }
  console.log("═".repeat(70) + "\n");
}

export function printHillClimbResult(result: HillClimbResult): void {
  console.log("\n" + "═".repeat(70));
  console.log("  HILL CLIMB RESULTS");
  console.log("═".repeat(70));
  console.log(`  Total games: ${result.totalGamesPlayed}`);
  const first = result.improvementHistory[0];
  console.log(`  Start win rate: ${first ? (first.winRate * 100).toFixed(1) : "?"}%`);
  const last = result.improvementHistory[result.improvementHistory.length - 1];
  console.log(`  Final win rate: ${last ? (last.winRate * 100).toFixed(1) : "?"}%`);
  console.log(`  Final avg VP: ${last ? last.avgVP.toFixed(1) : "?"}`);
  console.log("\n  Final weights (copy-paste ready):");
  console.log("  " + JSON.stringify(result.finalWeights, null, 2).replace(/\n/g, "\n  "));
  console.log("═".repeat(70) + "\n");
}

export function printLeagueResult(result: LeagueResult): void {
  console.log("\n" + "═".repeat(70));
  console.log("  LEAGUE TABLE");
  console.log("═".repeat(70));
  console.log(`  ${"#".padStart(3)} ${"Config".padEnd(20)} ${"Win%".padStart(6)} ${"Wins".padStart(5)} ${"Games".padStart(6)} ${"AvgVP".padStart(6)}`);
  console.log("  " + "─".repeat(50));

  result.standings.forEach((s, i) => {
    console.log(
      `  ${String(i + 1).padStart(3)} ${s.name.padEnd(20)} ${(s.winRate * 100).toFixed(1).padStart(5)}% ${String(s.totalWins).padStart(5)} ${String(s.totalGames).padStart(6)} ${s.avgVP.toFixed(1).padStart(6)}`
    );
  });

  // Head-to-head matrix
  if (result.standings.length <= 6) {
    console.log("\n  Head-to-Head (wins):");
    const names = result.standings.map((s) => s.name);
    console.log("  " + "".padEnd(20) + names.map((n) => n.slice(0, 8).padStart(10)).join(""));
    for (const s of result.standings) {
      const row = names.map((n) => {
        if (n === s.name) return "—".padStart(10);
        const h2h = s.headToHead[n];
        return h2h ? `${h2h.wins}-${h2h.losses}`.padStart(10) : "—".padStart(10);
      }).join("");
      console.log("  " + s.name.padEnd(20) + row);
    }
  }

  console.log("\n  Winner weights (copy-paste ready):");
  if (result.standings[0]) {
    console.log("  " + JSON.stringify(result.standings[0].weights, null, 2).replace(/\n/g, "\n  "));
  }
  console.log("═".repeat(70) + "\n");
}
