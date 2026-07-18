import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../Game.js";
import type { MyGameState } from "../types.js";
import { EmpiresBot } from "./EmpiresBot.js";
import { AILogger, getAILogger, setAILogger } from "./AILogger.js";
import type { DecisionLogEntry } from "./AILogger.js";
import type { AIMove } from "./types.js";
import {
  GameRecorder,
  captureSnapshot,
  type EnrichedDecision,
  type PlayerSnapshot,
  type GameRecord,
  type BattleContext,
} from "./GameRecorder.js";
import { AerialBattleStrategy } from "./v1/strategies/AerialBattleStrategy.js";
import { GroundBattleStrategy } from "./v1/strategies/GroundBattleStrategy.js";
import { AI_CONFIG } from "./v1/weightsConfig.js";
import { enumerateLegalMoves } from "./enumerate.js";
import log from "../helpers/logger.js";

const spLog = log.child({ mod: "selfplay" });

const DEFAULT_SNAPSHOT: PlayerSnapshot = {
  resources: {
    gold: 0,
    victoryPoints: 0,
    counsellors: 0,
    skyships: 0,
    regiments: 0,
    levies: 0,
    eliteRegiments: 0,
  },
  territory: { outposts: 0, colonies: 0, forts: 0 },
  vpStanding: { mine: 0, leader: 0, rank: 0 },
  fleetCount: 0,
  factories: 0,
  freeDissenters: 0,
  economy: { activeRoutes: 0, factories: 0, engagedFactories: 0 },
  buildings: { cathedrals: 0, palaces: 0, shipyards: 0 },
  alignment: { heresyPosition: 0, type: "orthodox" },
  fowCards: { count: 0, totalSwords: 0, totalShields: 0 },
  fleetPositions: [],
};

function isInvalidNumber(val: unknown): boolean {
  return val === null || val === undefined || typeof val !== "number" || isNaN(val as number);
}

function hasNaNResources(G: MyGameState): { hasIssue: boolean; detail: string } {
  for (const [id, player] of Object.entries(G.playerInfo)) {
    const r = player.resources;
    if (isInvalidNumber(r.levies)) return { hasIssue: true, detail: `P${id} levies=${r.levies}` };
    if (isInvalidNumber(r.regiments)) return { hasIssue: true, detail: `P${id} regiments=${r.regiments}` };
    if (isInvalidNumber(r.skyships)) return { hasIssue: true, detail: `P${id} skyships=${r.skyships}` };
  }
  return { hasIssue: false, detail: "" };
}

function hasNaNFleets(G: MyGameState): boolean {
  for (const player of Object.values(G.playerInfo)) {
    for (const fleet of player.fleetInfo) {
      if (
        typeof fleet.levies !== "number" || isNaN(fleet.levies) ||
        typeof fleet.regiments !== "number" || isNaN(fleet.regiments) ||
        typeof fleet.skyships !== "number" || isNaN(fleet.skyships)
      ) {
        return true;
      }
    }
  }
  return false;
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

interface BounceTracker {
  iterationsAtLastTurn: number;
  iterationsAtLastPhase: number;
  iterationsAtLastRound: number;
  lastTurn: number;
  lastPhase: string;
  lastRound: number;
  turnIters: number;
  phaseIters: number;
  roundIters: number;
}

const BOUNCE_THRESHOLD_TURN = 50;
const BOUNCE_THRESHOLD_PHASE = 100;
const BOUNCE_THRESHOLD_ROUND = 200;

function checkBounce(
  recorder: GameRecorder,
  tracker: BounceTracker,
  ctx: any,
  G: MyGameState,
  iterations: number
): void {
  const currentTurn = ctx.turn;
  const currentPhase = `${ctx.phase}/${G.stage.phase}:${G.stage.sub}`;
  const currentRound = G.round;

  // Track turn bounces
  if (currentTurn !== tracker.lastTurn) {
    if (tracker.turnIters > BOUNCE_THRESHOLD_TURN) {
      recorder.addDiagnostic({
        type: "bounce",
        iteration: iterations,
        round: currentRound,
        phase: currentPhase,
        playerID: ctx.currentPlayer,
        details: `BOUNCE-TURN: ${tracker.turnIters} iters on turn ${tracker.lastTurn} (>${BOUNCE_THRESHOLD_TURN})`,
      });
    }
    tracker.turnIters = 0;
    tracker.lastTurn = currentTurn;
  } else {
    tracker.turnIters++;
  }

  // Track phase bounces (stuck in same phase/stage)
  if (currentPhase !== tracker.lastPhase) {
    if (tracker.phaseIters > BOUNCE_THRESHOLD_PHASE) {
      recorder.addDiagnostic({
        type: "bounce",
        iteration: iterations,
        round: currentRound,
        phase: currentPhase,
        playerID: ctx.currentPlayer,
        details: `BOUNCE-PHASE: ${tracker.phaseIters} iters in "${tracker.lastPhase}" (>${BOUNCE_THRESHOLD_PHASE})`,
      });
    }
    recorder.addDiagnostic({
      type: "transition",
      iteration: iterations,
      round: currentRound,
      phase: currentPhase,
      playerID: ctx.currentPlayer,
      details: `${tracker.lastPhase || "start"} -> ${currentPhase}`,
    });
    tracker.phaseIters = 0;
    tracker.lastPhase = currentPhase;
  } else {
    tracker.phaseIters++;
  }

  // Track round bounces (stuck in same round)
  if (currentRound !== tracker.lastRound) {
    if (tracker.roundIters > BOUNCE_THRESHOLD_ROUND) {
      recorder.addDiagnostic({
        type: "bounce",
        iteration: iterations,
        round: currentRound,
        phase: currentPhase,
        playerID: ctx.currentPlayer,
        details: `BOUNCE-ROUND: ${tracker.roundIters} iters in round ${tracker.lastRound} (>${BOUNCE_THRESHOLD_ROUND})`,
      });
    }
    recorder.addDiagnostic({
      type: "round_start",
      iteration: iterations,
      round: currentRound,
      phase: currentPhase,
      playerID: ctx.currentPlayer,
      details: `Round ${currentRound} starting`,
    });
    tracker.roundIters = 0;
    tracker.lastRound = currentRound;
  } else {
    tracker.roundIters++;
  }
}

export function runGameLoop(
  clients: ReturnType<typeof Client>[],
  bots: EmpiresBot[],
  recorder: GameRecorder,
  maxIterations = 50000
): { finalState: any; iterations: number } {
  let iterations = 0;
  let lastMove: { move: string; args: any[] } | null = null;
  let lastStateKey = "";
  let staleCount = 0;
  let lastRound = -1;
  let lastPhase = "";
  const phaseTiming: Record<string, { ms: number; iters: number }> = {};
  let phaseStart = Date.now();
  let lastSub = "";

  const bounceTracker: BounceTracker = {
    iterationsAtLastTurn: 0,
    iterationsAtLastPhase: 0,
    iterationsAtLastRound: 0,
    lastTurn: 0,
    lastPhase: "",
    lastRound: 0,
    turnIters: 0,
    phaseIters: 0,
    roundIters: 0,
  };

  while (iterations < maxIterations) {
    const state = clients[0].getState();
    if (!state || state.ctx.gameover) break;

    const ctx = state.ctx;
    const G = state.G as MyGameState;
    const currentRound = G.round;
    const currentPhase = `${ctx.phase}/${G.stage.phase}:${G.stage.sub}`;

    // Round boundary
    if (currentRound !== lastRound) {
      lastRound = currentRound;
    }

    // Phase/stage transitions — track timing
    if (currentPhase !== lastPhase) {
      if (lastSub) {
        const entry = phaseTiming[lastSub] ?? { ms: 0, iters: 0 };
        entry.ms += Date.now() - phaseStart;
        phaseTiming[lastSub] = entry;
      }
      phaseStart = Date.now();
      lastSub = `${G.stage.phase}:${G.stage.sub}`;
      lastPhase = currentPhase;
    }

    // Track time per sub-stage
    const currentSub = `${G.stage.phase}:${G.stage.sub}`;
    if (currentSub !== lastSub) {
      if (lastSub) {
        const entry = phaseTiming[lastSub] ?? { ms: 0, iters: 0 };
        entry.ms += Date.now() - phaseStart;
        phaseTiming[lastSub] = entry;
      }
      phaseStart = Date.now();
      lastSub = currentSub;
    }
    if (lastSub) {
      const entry = phaseTiming[lastSub] ?? { ms: 0, iters: 0 };
      entry.iters++;
      phaseTiming[lastSub] = entry;
    }

    // Bounce detection (logs transitions + bounce warnings to recorder)
    checkBounce(recorder, bounceTracker, ctx, G, iterations);

    // Detect stalls: same phase/stage/turn/player repeating
    const stateKey = `${ctx.phase}/${G.stage.phase}:${G.stage.sub}/t${ctx.turn}/P${ctx.currentPlayer}`;
    if (stateKey === lastStateKey) {
      staleCount++;
      if (staleCount === 5) {
        const pIdx = parseInt(ctx.currentPlayer);
        const botState = clients[pIdx].getState();
        const move = botState
          ? bots[pIdx].chooseMove(botState.G as MyGameState, botState.ctx, ctx.currentPlayer)
          : null;
        recorder.addDiagnostic({
          type: "stall",
          iteration: iterations,
          round: G.round,
          phase: `${G.stage.phase}:${G.stage.sub}`,
          playerID: ctx.currentPlayer,
          details: `STALL: ${stateKey} — proposed move: ${move ? `${move.move}(${JSON.stringify(move.args)})` : "NULL"}`,
        });
      }
    } else {
      staleCount = 0;
      lastStateKey = stateKey;
    }

    // NaN checks
    const nanCheck = hasNaNResources(G);
    if (nanCheck.hasIssue) {
      recorder.addDiagnostic({
        type: "nan",
        iteration: iterations,
        round: G.round,
        phase: `${G.stage.phase}:${G.stage.sub}`,
        playerID: ctx.currentPlayer,
        details: nanCheck.detail,
      });
    }
    if (hasNaNFleets(G)) {
      recorder.addDiagnostic({
        type: "nan",
        iteration: iterations,
        round: G.round,
        phase: `${G.stage.phase}:${G.stage.sub}`,
        playerID: ctx.currentPlayer,
        details: "FLEET_NAN detected",
      });
    }

    if (ctx.activePlayers) {
      for (const [pid] of Object.entries(ctx.activePlayers)) {
        const pIdx = parseInt(pid);
        const botState = clients[pIdx].getState();
        if (!botState) continue;
        const botG = botState.G as MyGameState;

        bots[pIdx].setSnapshot(captureSnapshot(botG, pid));

        const move = bots[pIdx].chooseMove(botG, botState.ctx, pid);
        if (move) {
          (clients[pIdx] as any).moves[move.move]?.(...move.args);
        }
      }
    } else {
      const currentPlayer = ctx.currentPlayer;
      const pIdx = parseInt(currentPlayer);
      const botState = clients[pIdx].getState();
      if (!botState) { iterations++; continue; }

      const botG = botState.G as MyGameState;

      bots[pIdx].setSnapshot(captureSnapshot(botG, currentPlayer));

      lastMove = bots[pIdx].chooseMove(botG, botState.ctx, currentPlayer);
      const move = lastMove;
      if (move) {
        (clients[pIdx] as any).moves[move.move]?.(...move.args);
        const afterState = clients[pIdx].getState();
        if (afterState && hasNaNFleets(afterState.G as MyGameState)) {
          recorder.addDiagnostic({
            type: "nan",
            iteration: iterations,
            round: G.round,
            phase: `${G.stage.phase}:${G.stage.sub}`,
            playerID: currentPlayer,
            details: `FLEET_NAN_AFTER_MOVE: ${move.move}(${JSON.stringify(move.args)})`,
          });
        }
      } else {
        recorder.addDiagnostic({
          type: "skip",
          iteration: iterations,
          round: G.round,
          phase: `${G.stage.phase}:${G.stage.sub}`,
          playerID: currentPlayer,
          details: "No valid moves available",
        });
      }
    }

    iterations++;

    if (iterations % 100 === 0) {
      const s = clients[0].getState();
      if (s) {
        const diagG = s.G as MyGameState;
        const moveStr = lastMove ? `${lastMove.move}(${JSON.stringify(lastMove.args).slice(0, 60)})` : "null";
        spLog.info({ iterations, round: diagG.round, phase: s.ctx.phase, stage: `${diagG.stage.phase}:${diagG.stage.sub}`, turn: s.ctx.turn, currentPlayer: s.ctx.currentPlayer, move: moveStr }, "diag");
      }
    }

    if (iterations >= 5000) {
      const s = clients[0].getState();
      if (s) {
        const stuckG = s.G as MyGameState;
        const pIdx = parseInt(s.ctx.currentPlayer);
        const botState = clients[pIdx]?.getState();
        const availableMoves = botState ? enumerateLegalMoves(botState.G as MyGameState, botState.ctx, s.ctx.currentPlayer) : [];
        const lastMove = botState ? bots[pIdx].chooseMove(botState.G as MyGameState, botState.ctx, s.ctx.currentPlayer) : null;
        spLog.warn({ iterations, round: stuckG.round, phase: s.ctx.phase, stage: `${stuckG.stage.phase}:${stuckG.stage.sub}`, turn: s.ctx.turn, currentPlayer: s.ctx.currentPlayer, availableMoves: availableMoves.length, chosen: lastMove?.move ?? 'null' }, "stuck");
        recorder.addDiagnostic({
          type: "stall",
          iteration: iterations,
          round: stuckG.round,
          phase: `${stuckG.stage.phase}:${stuckG.stage.sub}`,
          playerID: s.ctx.currentPlayer,
          details: `STUCK at iter ${iterations}: available=${availableMoves.length}, chosen=${lastMove?.move ?? 'null'}`,
        });
      }
      break;
    }
  }

  if (lastSub) {
    const entry = phaseTiming[lastSub] ?? { ms: 0, iters: 0 };
    entry.ms += Date.now() - phaseStart;
    phaseTiming[lastSub] = entry;
  }
  const sorted = Object.entries(phaseTiming).sort((a, b) => b[1].ms - a[1].ms);
  spLog.info({ iterations, timing: Object.fromEntries(sorted.slice(0, 10)) }, "timing breakdown");

  const finalState = clients[0].getState();
  for (const c of clients) c.stop();

  return { finalState, iterations };
}

export function runSingleGame(gameNumber: number): GameRecord {
  const recorder = new GameRecorder(`game_${gameNumber}`);
  recorder.setConfig(AI_CONFIG as unknown as Record<string, unknown>);

  // Create 6 local clients sharing the same match via Local multiplayer
  const clients: ReturnType<typeof Client>[] = [];
  const bots: EmpiresBot[] = [];

  const BATTLE_MOVES = new Set([
    "attackOtherPlayersFleet", "doNotAttack", "evadeFleet", "retaliateFleet",
    "groundAttack", "doNotGroundAttack", "defendGround", "yieldGround",
  ]);
  const logger = new AILogger((entry) => {
    if (entry.type !== "decision") return;
    const decisionEntry = entry as DecisionLogEntry;
    const pIdx = parseInt(decisionEntry.playerID);
    const snapshot = bots[pIdx]?.getLastSnapshot();

    let battleContext: BattleContext | undefined;
    if (BATTLE_MOVES.has(decisionEntry.chosenMove)) {
      const targetID = decisionEntry.chosenArgs?.[0] as string ?? "?";
      const mySnap = snapshot ?? DEFAULT_SNAPSHOT;
      const decision = decisionEntry.chosenMove === "attackOtherPlayersFleet" ? "attack" as const
        : decisionEntry.chosenMove === "doNotAttack" ? "doNotAttack" as const
        : decisionEntry.chosenMove === "evadeFleet" ? "evade" as const
        : "fight" as const;
      battleContext = {
        myStrength: mySnap.fowCards.totalSwords + mySnap.fowCards.totalShields,
        enemyStrength: 0,
        ratio: 0,
        threshold: 0,
        fowCardCount: mySnap.fowCards.count,
        targetID,
        decision,
      };
    }

    const enriched: EnrichedDecision = {
      ...decisionEntry,
      snapshot: snapshot ?? DEFAULT_SNAPSHOT,
      battleContext,
    };
    recorder.addDecision(enriched);
  });

  const origLogger = getAILogger();
  setAILogger(logger);

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

  const { finalState, iterations } = runGameLoop(clients, bots, recorder);

  setAILogger(origLogger);

  if (!finalState?.ctx.gameover) {
    spLog.warn({ gameNumber, iterations }, "game did not complete");
    return recorder.getRecord();
  }

  const G = finalState.G as MyGameState;
  const ranking: string[] = finalState.ctx.gameover?.ranking ?? [];

  for (const [pid, player] of Object.entries(G.playerInfo)) {
    const bot = bots[parseInt(pid)];
    const personality = bot.getPersonality();
    const pName = personality ? `${personality.kaCard}+${personality.legacyCard}` : "Unknown";
    recorder.addPlayer(pid, {
      playerID: pid,
      personality: pName,
      kaCard: player.resources.advantageCard ?? "none",
      legacyCard: player.resources.legacyCard?.name ?? "none",
      alignment: player.hereticOrOrthodox,
      weights: {} as any,
      finalVP: player.resources.victoryPoints,
      finalRank: ranking.indexOf(pid) + 1,
    });
  }

  const scores: Record<string, number> = {};
  for (const [pid, player] of Object.entries(G.playerInfo)) {
    scores[pid] = player.resources.victoryPoints;
  }

  const winnerID = ranking[0] ?? "0";
  const winnerBot = bots[parseInt(winnerID)];
  const rankingsArray = ranking.map((pid, idx) => ({
    playerID: pid,
    personality: (() => { const p = bots[parseInt(pid)]?.getPersonality(); return p ? `${p.kaCard}+${p.legacyCard}` : "Unknown"; })(),
    vp: G.playerInfo[pid]?.resources.victoryPoints ?? 0,
    rank: idx + 1,
  }));

  const winnerP = winnerBot?.getPersonality();
  recorder.setResult({
    winner: winnerID,
    winnerPersonality: winnerP ? `${winnerP.kaCard}+${winnerP.legacyCard}` : "Unknown",
    scores,
    rounds: G.round,
    rankings: rankingsArray,
  });

  return recorder.getRecord();
}

export function runSelfPlayRecords(
  numGames: number,
  quiet = false
): GameRecord[] {
  const logger = new AILogger();
  setAILogger(logger);

  const records: GameRecord[] = [];

  for (let i = 0; i < numGames; i++) {
    if (!quiet && i % 10 === 0) {
      spLog.info({ game: i + 1, total: numGames }, "running game");
    }

    const record = runSingleGame(i + 1);
    records.push(record);

    if (!quiet && record.result) {
      const r = record.result;
      const winnerVP = r.scores[r.winner] ?? 0;
      spLog.info({ game: i + 1, winner: r.winner, winnerVP, avgVP: (Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.values(r.scores).length).toFixed(1) }, "game completed");
    }

    logger.clear();
  }

  setAILogger(new AILogger());

  return records;
}

export function runSelfPlay(
  numGames: number,
  quiet = false
): BalanceReport {
  const records = runSelfPlayRecords(numGames, quiet);
  return analyzeBalance(records, numGames);
}

function analyzeBalance(records: GameRecord[], totalGames: number): BalanceReport {
  const winsByPersonality: Record<string, number> = {};
  const scoresByPersonality: Record<string, number[]> = {};
  const winsByKA: Record<string, number> = {};
  const gamesByKA: Record<string, number> = {};
  const winsByLegacy: Record<string, number> = {};
  const gamesByLegacy: Record<string, number> = {};
  const comboWins: Record<string, number> = {};
  const comboGames: Record<string, number> = {};
  const scoreSpread: number[] = [];

  for (const record of records) {
    // Only analyse completed games
    if (!record.result) continue;

    const r = record.result;
    const winnerID = r.winner;

    // Winner personality — read from players summary
    const winnerSummary = record.players[winnerID];
    const winnerPersonality = winnerSummary?.personality ?? "Unknown";
    const winnerKACard = winnerSummary?.kaCard ?? "none";
    const winnerLegacyCard = winnerSummary?.legacyCard ?? "none";

    // Personality stats
    winsByPersonality[winnerPersonality] = (winsByPersonality[winnerPersonality] ?? 0) + 1;

    for (const [pid, summary] of Object.entries(record.players)) {
      const personality = summary.personality;
      if (!scoresByPersonality[personality]) scoresByPersonality[personality] = [];
      scoresByPersonality[personality].push(r.scores[pid] ?? 0);
    }

    // KA card stats
    winsByKA[winnerKACard] = (winsByKA[winnerKACard] ?? 0) + 1;
    for (const summary of Object.values(record.players)) {
      gamesByKA[summary.kaCard] = (gamesByKA[summary.kaCard] ?? 0) + 1;
    }

    // Legacy card stats
    winsByLegacy[winnerLegacyCard] = (winsByLegacy[winnerLegacyCard] ?? 0) + 1;
    for (const summary of Object.values(record.players)) {
      gamesByLegacy[summary.legacyCard] = (gamesByLegacy[summary.legacyCard] ?? 0) + 1;
    }

    // Card combo stats
    for (const [pid, summary] of Object.entries(record.players)) {
      const key = `${summary.kaCard}+${summary.legacyCard}`;
      comboGames[key] = (comboGames[key] ?? 0) + 1;
      if (pid === winnerID) {
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
  const completedGames = records.filter((r) => r.result !== null).length;

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

export function printBalanceReport(report: BalanceReport): void {
  console.log("\n" + "═".repeat(70));
  console.log("  BALANCE REPORT");
  console.log("═".repeat(70));
  console.log(`  Games: ${report.completedGames}/${report.totalGames} completed`);
  console.log(`  Avg score spread (1st - last): ${report.avgScoreSpread.toFixed(1)} VP`);
  if (report.dominantStrategy) {
    console.log(`  WARNING DOMINANT STRATEGY: ${report.dominantStrategy} (>25% win rate)`);
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
    console.log(`  Best:  ${b.ka} + ${b.legacy} -> ${(b.winRate * 100).toFixed(1)}% (${b.games} games)`);
    if (report.worstCardCombo) {
      const w = report.worstCardCombo;
      console.log(`  Worst: ${w.ka} + ${w.legacy} -> ${(w.winRate * 100).toFixed(1)}% (${w.games} games)`);
    }
  }

  console.log("═".repeat(70) + "\n");
}
