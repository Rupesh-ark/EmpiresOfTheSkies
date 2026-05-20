/**
 * browserRunner.ts — Browser-compatible headless game runner for the AI analytics dashboard.
 *
 * This is a parallel version of selfPlay.ts that:
 *  - Has NO Node.js fs imports (safe to bundle into a browser/Vite build)
 *  - Uses GameRecorder for all diagnostic output instead of /tmp/ files
 *  - Returns a GameRecord object that the UI can inspect live or serialize
 *
 * selfPlay.ts is left untouched — it remains the Node.js CLI version.
 */

import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../Game";
import type { MyGameState } from "../types";
import { EmpiresBot } from "./EmpiresBot";
import { AILogger, setAILogger, getAILogger } from "./AILogger";
import type { DecisionLogEntry } from "./AILogger";
import {
  GameRecorder,
  captureSnapshot,
  type EnrichedDecision,
  type PlayerSnapshot,
  type GameRecord,
} from "./GameRecorder";
import { AerialBattleStrategy } from "./v1/strategies/AerialBattleStrategy";
import { GroundBattleStrategy } from "./v1/strategies/GroundBattleStrategy";
import { AI_CONFIG } from "./v1/weightsConfig";

// Progress callback for UI updates

export type ProgressCallback = (info: {
  iteration: number;
  round: number;
  phase: string;
  playerID: string;
}) => void;

// Bounce detection (mirrors selfPlay.ts constants)

const BOUNCE_THRESHOLD_TURN = 50;
const BOUNCE_THRESHOLD_PHASE = 100;
const BOUNCE_THRESHOLD_ROUND = 200;

interface BounceTracker {
  lastTurn: number;
  lastPhase: string;
  lastRound: number;
  turnIters: number;
  phaseIters: number;
  roundIters: number;
}

// NaN detection helpers (same logic as selfPlay.ts)

function isInvalidNumber(val: unknown): boolean {
  return val === null || val === undefined || typeof val !== "number" || isNaN(val as number);
}

function hasNaNResources(G: MyGameState): { hasIssue: boolean; detail: string } {
  for (const [id, player] of Object.entries(G.playerInfo)) {
    const r = player.resources;
    if (isInvalidNumber(r.levies)) return { hasIssue: true, detail: `P${id} levies=${r.levies}` };
    if (isInvalidNumber(r.regiments)) return { hasIssue: true, detail: `P${id} regiments=${r.regiments}` };
    if (isInvalidNumber(r.skyships)) return { hasIssue: true, detail: `P${id} skyships=${r.skyships}` };
    if (isInvalidNumber(r.gold)) return { hasIssue: true, detail: `P${id} gold=${r.gold}` };
    if (isInvalidNumber(r.eliteRegiments)) return { hasIssue: true, detail: `P${id} elites=${r.eliteRegiments}` };
    if (isInvalidNumber(r.counsellors)) return { hasIssue: true, detail: `P${id} counsellors=${r.counsellors}` };
    if (isInvalidNumber(r.victoryPoints)) return { hasIssue: true, detail: `P${id} VP=${r.victoryPoints}` };
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

// Snapshot builder — imported from GameRecorder (captureSnapshot)
// captureSnapshot(G, playerID) is re-exported from GameRecorder and used below.

// Bounce checker (logs to recorder instead of /tmp/)

function checkBounce(
  recorder: GameRecorder,
  tracker: BounceTracker,
  ctx: { turn: number; currentPlayer: string },
  G: MyGameState,
  iterations: number
): void {
  const currentTurn = ctx.turn;
  const currentPhase = `${G.stage.phase}:${G.stage.sub}`;
  const currentRound = G.round;

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

// Main exported runner

/**
 * Run a single complete game headlessly in the browser.
 *
 * @param configOverrides  Optional key-value overrides merged into AI_CONFIG snapshot
 *                         (recorded for reproducibility — does NOT change live behaviour)
 * @param onProgress       Optional callback called every 50 iterations for UI updates
 * @returns                A complete GameRecord that the dashboard can display
 */
export function runGameInBrowser(
  configOverrides?: Record<string, unknown>,
  onProgress?: ProgressCallback
): GameRecord {
  const recorder = new GameRecorder();

  // Record the config snapshot (merge overrides on top of live config for traceability)
  recorder.setConfig({ ...AI_CONFIG as unknown as Record<string, unknown>, ...configOverrides });

  // Wire AILogger to capture decisions into the recorder
  const logger = new AILogger((entry) => {
    if (entry.type !== "decision") return;

    const decisionEntry = entry as DecisionLogEntry;

    // The browserRunner sets a snapshot on each bot before chooseMove() is called.
    // Retrieve it from the corresponding bot via the bots array captured in closure.
    const pIdx = parseInt(decisionEntry.playerID);
    const snapshot = bots[pIdx]?.getLastSnapshot();

    // Consume any pending battle context — aerial and ground are mutually exclusive phases
    const battleContext =
      (AerialBattleStrategy.getLastBattleContext() ??
        GroundBattleStrategy.getLastBattleContext()) ?? undefined;

    const enriched: EnrichedDecision = {
      ...decisionEntry,
      snapshot: snapshot ?? {
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
      },
      battleContext,
    };

    recorder.addDecision(enriched);
  });

  // Wire round summaries too
  const origLogger = getAILogger();
  setAILogger(logger);

  // Create 6 clients + bots
  const clients: ReturnType<typeof Client>[] = [];
  // bots is declared here (referenced in the closure above via hoisting)
  const bots: EmpiresBot[] = [];

  // Unique matchID per game to prevent Local() state caching across runs
  const matchID = `stress_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const localTransport = Local();

  for (let p = 0; p < 6; p++) {
    const playerID = String(p);
    const bot = new EmpiresBot({ playerID });
    bots.push(bot);

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

  // Game loop (adapted from runGameLoop in selfPlay.ts)

  const MAX_ITERATIONS = 50000;
  let iterations = 0;
  let lastStateKey = "";
  let staleCount = 0;
  let lastRound = -1;

  const bounceTracker: BounceTracker = {
    lastTurn: 0,
    lastPhase: "",
    lastRound: 0,
    turnIters: 0,
    phaseIters: 0,
    roundIters: 0,
  };

  while (iterations < MAX_ITERATIONS) {
    const state = clients[0].getState();
    if (!state || state.ctx.gameover) break;

    const ctx = state.ctx;
    const G = state.G as MyGameState;

    // Round boundary logging
    if (G.round !== lastRound) {
      lastRound = G.round;
    }

    // Bounce detection (logs transitions + bounce warnings to recorder)
    checkBounce(recorder, bounceTracker, ctx, G, iterations);

    // Stall detection: same key repeating
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
        details: `FLEET_NAN detected`,
      });
    }

    // Progress callback every 50 iterations
    if (iterations % 50 === 0 && onProgress) {
      onProgress({
        iteration: iterations,
        round: G.round,
        phase: `${G.stage.phase}:${G.stage.sub}`,
        playerID: ctx.currentPlayer,
      });
    }

    // Handle activePlayers (election — simultaneous)
    if (ctx.activePlayers) {
      for (const [pid] of Object.entries(ctx.activePlayers)) {
        const pIdx = parseInt(pid);
        const botState = clients[pIdx].getState();
        if (!botState) continue;
        const botG = botState.G as MyGameState;

        // Set snapshot BEFORE chooseMove so the AILogger onEntry callback can read it
        bots[pIdx].setSnapshot(captureSnapshot(botG, pid));

        const move = bots[pIdx].chooseMove(botG, botState.ctx, pid);
        if (move) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (clients[pIdx] as any).moves[move.move]?.(...move.args);
        }
      }
    } else {
      // Sequential turn: current player acts
      const currentPlayer = ctx.currentPlayer;
      const pIdx = parseInt(currentPlayer);
      const botState = clients[pIdx].getState();
      if (!botState) {
        iterations++;
        continue;
      }

      const botG = botState.G as MyGameState;

      // Set snapshot BEFORE chooseMove so the AILogger onEntry callback can read it
      bots[pIdx].setSnapshot(captureSnapshot(botG, currentPlayer));

      const move = bots[pIdx].chooseMove(botG, botState.ctx, currentPlayer);
      if (move) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (clients[pIdx] as any).moves[move.move]?.(...move.args);
        // Check NaN after move execution to catch the culprit
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
          details: `No valid moves available`,
        });
      }
    }

    iterations++;

    // Hard exit if approaching limit (mirrors selfPlay.ts)
    if (iterations >= 49000) {
      const s = clients[0].getState();
      if (s) {
        const gStuck = s.G as MyGameState;
        recorder.addDiagnostic({
          type: "stall",
          iteration: iterations,
          round: gStuck.round,
          phase: `${gStuck.stage.phase}:${gStuck.stage.sub}`,
          playerID: s.ctx.currentPlayer,
          details: `STUCK at iteration limit`,
        });
      }
      break;
    }
  }

  // Populate player summaries from final state (BEFORE stopping clients)
  const finalState = clients[0].getState();

  // Stop all clients
  for (const c of clients) c.stop();

  // Restore the previous logger
  setAILogger(origLogger);
  if (finalState) {
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
    if (finalState.ctx.gameover) {
      recorder.setResult({
        winner: winnerID,
        winnerPersonality: winnerP ? `${winnerP.kaCard}+${winnerP.legacyCard}` : "Unknown",
        scores,
        rounds: G.round,
        rankings: rankingsArray,
      });
    }
  }

  return recorder.getRecord();
}
