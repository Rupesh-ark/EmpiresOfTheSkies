/**
 * tunerRunner.ts — CLI entry point for CMA-ES weight tuning.
 *
 * Compiled to JS via `pnpm build:all`, then run with plain Node:
 *   node dist/cjs/ai/tuner/tunerRunner.js
 *
 * Environment variables (set by Python caller):
 *   TUNER_BUCKET   — A, B, D, E, F, G, H, or I
 *   TUNER_WEIGHTS  — path to single candidate weights JSON (single mode)
 *   TUNER_BATCH    — path to JSON array of weight dicts (batch mode)
 *   TUNER_GAMES    — number of games to run (default 20)
 *   TUNER_OUTPUT   — path to write results JSON
 *   TUNER_FREEZE_A — path to frozen Bucket A weights (optional)
 *   TUNER_FREEZE_B — path to frozen Bucket B weights (optional)
 *   TUNER_FREEZE_D — path to frozen Bucket D weights (optional)
 */

import * as fs from "fs";
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../../Game.js";
import type { MyGameState } from "../../types.js";
import { EmpiresBot } from "../EmpiresBot.js";
import { setAILogger } from "../AILogger.js";
import { AILogger } from "../AILogger.js";
import { GameRecorder } from "../GameRecorder.js";
import { runGameLoop } from "../selfPlay.js";
import { setV2Config, resetV2Config } from "../evaluators/config.js";
import { setEvalWeights } from "../mcts/StateEvaluator.js";
import { setMCTSConfig } from "../mcts/config.js";
import type { EvalWeights } from "../mcts/tournament.js";

// Reduce MCTS overhead for tuning — 25 sims instead of 60
setMCTSConfig({ simulationsPerMove: 25, rolloutDepth: 3, explorationConstant: 1.4 });

function readJSON(path: string): any {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

// Bucket injection

function injectBucketA(weights: Record<string, number>): void {
  setEvalWeights(weights as unknown as EvalWeights);
}

function injectBucketB(weights: Record<string, number>, freezeA?: Record<string, number>): void {
  if (freezeA) setEvalWeights(freezeA as unknown as EvalWeights);
  setV2Config({ baseQuality: weights });
}

function injectBucketD(
  weights: Record<string, number>,
  freezeA?: Record<string, number>,
  freezeB?: Record<string, number>
): void {
  if (freezeA) setEvalWeights(freezeA as unknown as EvalWeights);
  if (freezeB) setV2Config({ baseQuality: freezeB });

  const {
    penaltyScale,
    qualityThreshold,
    goldPressure_0,
    goldPressure_1,
    goldPressure_2,
    goldPressure_3,
    diminishing_perUnit,
    diminishing_hardCapPenalty,
    round_tooEarlyPenalty,
    round_tooLatePenalty,
    round_mildPenalty,
    round_finalRoundBonus,
  } = weights;

  setV2Config({
    penaltyScale,
    qualityThreshold,
    goldPressure: {
      levels: [
        { below: -10, penalty: goldPressure_0 },
        { below: -3,  penalty: goldPressure_1 },
        { below: 0,   penalty: goldPressure_2 },
        { below: 5,   penalty: goldPressure_3 },
      ],
    },
    diminishing: {
      perUnit: diminishing_perUnit,
      hardCapPenalty: diminishing_hardCapPenalty,
    },
    round: {
      tooEarlyPenalty: round_tooEarlyPenalty,
      tooLatePenalty: round_tooLatePenalty,
      mildPenalty: round_mildPenalty,
      finalRoundBonus: round_finalRoundBonus,
    },
  });
}

function applyFreezes(
  freezeA?: Record<string, number>,
  freezeB?: Record<string, number>,
  freezeD?: Record<string, number>
): void {
  if (freezeA) setEvalWeights(freezeA as unknown as EvalWeights);
  if (freezeB) setV2Config({ baseQuality: freezeB });
  if (freezeD) {
    injectBucketD(freezeD);
  }
}

function injectBucketE(
  weights: Record<string, number>,
  freezeA?: Record<string, number>,
  freezeB?: Record<string, number>,
  freezeD?: Record<string, number>
): void {
  applyFreezes(freezeA, freezeB, freezeD);
  setV2Config({ bonuses: weights });
}

function injectBucketF(
  weights: Record<string, number>,
  freezeA?: Record<string, number>,
  freezeB?: Record<string, number>,
  freezeD?: Record<string, number>
): void {
  applyFreezes(freezeA, freezeB, freezeD);
  setV2Config({ bonuses: weights });
}

function injectBucketG(
  weights: Record<string, number>,
  freezeA?: Record<string, number>,
  freezeB?: Record<string, number>,
  freezeD?: Record<string, number>
): void {
  applyFreezes(freezeA, freezeB, freezeD);
  setV2Config({ bonuses: weights });
}

function injectBucketH(
  weights: Record<string, number>,
  freezeA?: Record<string, number>,
  freezeB?: Record<string, number>,
  freezeD?: Record<string, number>
): void {
  applyFreezes(freezeA, freezeB, freezeD);
  setV2Config({ resolution: weights });
}

function injectBucketI(
  weights: Record<string, number>,
  freezeA?: Record<string, number>,
  freezeB?: Record<string, number>,
  freezeD?: Record<string, number>
): void {
  applyFreezes(freezeA, freezeB, freezeD);
  setV2Config({ bonuses: weights });
}

// Inject weights for a bucket

function injectWeights(
  bucket: string,
  weights: Record<string, number>,
  freezeA?: Record<string, number>,
  freezeB?: Record<string, number>,
  freezeD?: Record<string, number>,
): void {
  resetV2Config();
  setEvalWeights(null);

  switch (bucket) {
    case "A": injectBucketA(weights); break;
    case "B": injectBucketB(weights, freezeA); break;
    case "D": injectBucketD(weights, freezeA, freezeB); break;
    case "E": injectBucketE(weights, freezeA, freezeB, freezeD); break;
    case "F": injectBucketF(weights, freezeA, freezeB, freezeD); break;
    case "G": injectBucketG(weights, freezeA, freezeB, freezeD); break;
    case "H": injectBucketH(weights, freezeA, freezeB, freezeD); break;
    case "I": injectBucketI(weights, freezeA, freezeB, freezeD); break;
  }
}

// Single game

let gameCounter = 0;

function runOneGame(): { vps: number[]; archetypes: string[] } | null {
  const recorder = new GameRecorder("tune");
  const clients: ReturnType<typeof Client>[] = [];
  const bots: EmpiresBot[] = [];

  setAILogger(new AILogger());

  // Unique matchID per game ensures different PRNG seeds
  const matchID = `tune_${Date.now()}_${gameCounter++}`;
  const localTransport = Local();

  for (let p = 0; p < 6; p++) {
    const playerID = String(p);
    bots.push(new EmpiresBot({ playerID }));
    const client = Client({
      game: MyGame,
      numPlayers: 6,
      multiplayer: localTransport,
      playerID,
      matchID,
    });
    client.start();
    clients.push(client);
  }

  const startMs = Date.now();
  const { finalState, iterations } = runGameLoop(clients, bots, recorder, 50000);
  const elapsedMs = Date.now() - startMs;
  if (!finalState?.ctx.gameover) {
    const G = finalState?.G as MyGameState | undefined;
    const ctx = finalState?.ctx;
    if (G && ctx) {
      process.stderr.write(`[STALL] ${elapsedMs}ms iters=${iterations} R${G.round} phase=${ctx.phase} stage=${G.stage.phase}:${G.stage.sub} P${ctx.currentPlayer}\n`);
    }
    // Dump bounce/stall diagnostics from recorder
    const record = recorder.getRecord();
    const diags = (record as any).diagnostics ?? [];
    const stalls = diags.filter((d: any) => d.type === "bounce" || d.type === "stall");
    for (const s of stalls.slice(-10)) {
      process.stderr.write(`  ${s.type}: R${s.round} ${s.phase} P${s.playerID} — ${s.details}\n`);
    }
  }

  for (const c of clients) c.stop();

  if (!finalState?.ctx.gameover) return null;

  const G = finalState.G as MyGameState;
  const pids = Object.keys(G.playerInfo).sort();
  return {
    vps: pids.map((pid) => G.playerInfo[pid].resources.victoryPoints),
    archetypes: pids.map((pid) => G.playerInfo[pid].resources.legacyCard?.name ?? "none"),
  };
}

// Evaluate one candidate (N games)

function evaluateCandidate(numGames: number): {
  avgVP: number;
  scores: number[][];
  archetypeSpread: number;
  vpByArchetype: Record<string, number>;
} {
  const allScores: number[][] = [];
  const archetypeVPs: Record<string, number[]> = {};

  for (let i = 0; i < numGames; i++) {
    const result = runOneGame();
    if (result !== null) {
      allScores.push(result.vps);
      for (let j = 0; j < result.vps.length; j++) {
        const arch = result.archetypes[j];
        if (!archetypeVPs[arch]) archetypeVPs[arch] = [];
        archetypeVPs[arch].push(result.vps[j]);
      }
    }
  }

  let totalVP = 0;
  let totalPlayers = 0;
  for (const game of allScores) {
    for (const vp of game) {
      totalVP += vp;
      totalPlayers++;
    }
  }
  const avgVP = totalPlayers > 0 ? totalVP / totalPlayers : 0;

  const vpByArchetype: Record<string, number> = {};
  const archAvgs: number[] = [];
  for (const [arch, vps] of Object.entries(archetypeVPs)) {
    const avg = vps.reduce((a, b) => a + b, 0) / vps.length;
    vpByArchetype[arch] = Math.round(avg * 100) / 100;
    archAvgs.push(avg);
  }

  let archetypeSpread = 0;
  if (archAvgs.length > 1) {
    const mean = archAvgs.reduce((a, b) => a + b, 0) / archAvgs.length;
    const variance = archAvgs.reduce((sum, v) => sum + (v - mean) ** 2, 0) / archAvgs.length;
    archetypeSpread = Math.sqrt(variance);
  }

  return {
    avgVP: Math.round(avgVP * 100) / 100,
    scores: allScores,
    archetypeSpread: Math.round(archetypeSpread * 100) / 100,
    vpByArchetype,
  };
}

function main(): void {
  const bucket = process.env.TUNER_BUCKET ?? "A";
  const numGames = parseInt(process.env.TUNER_GAMES ?? "20", 10);
  const outputPath = process.env.TUNER_OUTPUT;
  const batchPath = process.env.TUNER_BATCH;
  const singlePath = process.env.TUNER_WEIGHTS;
  const freezeAPath = process.env.TUNER_FREEZE_A;
  const freezeBPath = process.env.TUNER_FREEZE_B;
  const freezeDPath = process.env.TUNER_FREEZE_D;

  if (!outputPath) {
    process.exit(1);
  }

  const freezeA = freezeAPath ? readJSON(freezeAPath) : undefined;
  const freezeB = freezeBPath ? readJSON(freezeBPath) : undefined;
  const freezeD = freezeDPath ? readJSON(freezeDPath) : undefined;

  // SINGLE candidate mode only — Python handles batching by launching
  // one Node process per candidate (avoids boardgame.io state leaks)
  const weightsPath = batchPath ?? singlePath;
  if (!weightsPath) {
    process.exit(1);
  }

  const rawWeights = readJSON(weightsPath);

  // Support both single object and array (take first element if array)
  const weights: Record<string, number> = Array.isArray(rawWeights) ? rawWeights[0] : rawWeights;

  injectWeights(bucket, weights, freezeA, freezeB, freezeD);
  const { avgVP, scores, archetypeSpread, vpByArchetype } = evaluateCandidate(numGames);

  resetV2Config();
  setEvalWeights(null);

  fs.writeFileSync(outputPath, JSON.stringify({
    avgVP,
    archetypeSpread,
    vpByArchetype,
    games: numGames,
    completed: scores.length,
    scores,
  }));
}

main();
