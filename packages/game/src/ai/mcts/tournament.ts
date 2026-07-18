/**
 * MCTS Tournament — test different state evaluator weights against each other.
 *
 * Runs N games, tracks win rates and VP by evaluator configuration.
 */
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { MyGame } from "../../Game.js";
import type { MyGameState } from "../../types.js";
import { EmpiresBot } from "../EmpiresBot.js";
import { AILogger, setAILogger, getAILogger } from "../AILogger.js";
import { GameRecorder } from "../GameRecorder.js";
import { runGameLoop } from "../selfPlay.js";
import { setEvalWeights } from "./StateEvaluator.js";

// Evaluator weight config (what we're tuning)

export interface EvalWeights {
  name: string;
  vp: number;
  colony: number;
  outpost: number;
  route: number;
  engagedFactory: number;
  cathedral: number;
  palace: number;
  shipyard: number;
  fort: number;
  skyship: number;
  regiment: number;
  eliteRegiment: number;
  levy: number;
  gold: number;
  counsellor: number;
  militaryStrength: number;
  heresyVP: number;
  debtPenalty: number;
  dissenterPenalty: number;
  unconnectedPenalty: number;
}

export const DEFAULT_EVAL_WEIGHTS: EvalWeights = {
  name: "default",
  vp: 1.0,
  colony: 0.8,
  outpost: 0.4,
  route: 0.5,
  engagedFactory: 0.3,
  cathedral: 0.3,
  palace: 0.2,
  shipyard: 0.2,
  fort: 0.1,
  skyship: 0.05,
  regiment: 0.02,
  eliteRegiment: 0.03,
  levy: 0.01,
  gold: 0.02,
  counsellor: 0.1,
  militaryStrength: 0.01,
  heresyVP: 0.5,
  debtPenalty: 0.01,
  dissenterPenalty: 0.15,
  unconnectedPenalty: 0.3,
};

// Tournament result

export interface TournamentEntry {
  config: EvalWeights;
  wins: number;
  totalVP: number;
  gamesPlayed: number;
}

export interface TournamentResult {
  entries: TournamentEntry[];
  totalGames: number;
}

// Run tournament

export function runEvalTournament(
  configs: EvalWeights[],
  gamesPerConfig: number,
): TournamentResult {
  const entries: Map<string, TournamentEntry> = new Map();
  for (const config of configs) {
    entries.set(config.name, { config, wins: 0, totalVP: 0, gamesPlayed: 0 });
  }

  const totalGames = gamesPerConfig * configs.length;
  let gameNum = 0;

  for (const activeConfig of configs) {
    for (let g = 0; g < gamesPerConfig; g++) {
      gameNum++;
      console.log(`Game ${gameNum}/${totalGames}: testing "${activeConfig.name}"...`);

      // Set eval weights for this game
      setEvalWeights(activeConfig);
      const result = runSingleTournamentGame(gameNum);
      if (!result) continue;

      // Track results for all players
      for (const [pid, vp] of Object.entries(result.scores)) {
        // In this simple tournament, all bots use the same config
        // (we're testing if certain eval weights produce better outcomes)
        const entry = entries.get(activeConfig.name)!;
        entry.gamesPlayed++;
        entry.totalVP += vp;
        if (pid === result.winner) entry.wins++;
      }
    }
  }

  return {
    entries: [...entries.values()],
    totalGames: gameNum,
  };
}

function runSingleTournamentGame(gameNumber: number): {
  winner: string;
  scores: Record<string, number>;
} | null {
  const recorder = new GameRecorder();
  const logger = new AILogger();
  const origLogger = getAILogger();
  setAILogger(logger);

  const clients: ReturnType<typeof Client>[] = [];
  const bots: EmpiresBot[] = [];
  const matchID = `tournament_${Date.now()}_${gameNumber}`;
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

  const { finalState } = runGameLoop(clients, bots, recorder);

  for (const c of clients) c.stop();
  setAILogger(origLogger);

  if (!finalState?.ctx.gameover) return null;

  const G = finalState.G as MyGameState;
  const ranking: string[] = finalState.ctx.gameover?.ranking ?? [];
  const scores: Record<string, number> = {};
  for (const [pid, player] of Object.entries(G.playerInfo)) {
    scores[pid] = player.resources.victoryPoints;
  }

  return { winner: ranking[0] ?? "0", scores };
}

// Print tournament results

export function printTournamentResult(result: TournamentResult): void {
  console.log("\n" + "═".repeat(60));
  console.log("  TOURNAMENT RESULTS");
  console.log("═".repeat(60));
  console.log(`  Total games: ${result.totalGames}`);

  const sorted = [...result.entries].sort((a, b) => {
    const aAvg = a.gamesPlayed > 0 ? a.totalVP / a.gamesPlayed : 0;
    const bAvg = b.gamesPlayed > 0 ? b.totalVP / b.gamesPlayed : 0;
    return bAvg - aAvg;
  });

  console.log("\n" + "─".repeat(60));
  console.log("  Config Name".padEnd(25) + "Games".padStart(8) + "Wins".padStart(8) + "Win%".padStart(8) + "Avg VP".padStart(10));
  console.log("─".repeat(60));

  for (const entry of sorted) {
    const avgVP = entry.gamesPlayed > 0 ? (entry.totalVP / entry.gamesPlayed).toFixed(1) : "0";
    const winRate = entry.gamesPlayed > 0 ? ((entry.wins / entry.gamesPlayed) * 100).toFixed(1) : "0";
    console.log(
      `  ${entry.config.name.padEnd(23)}${String(entry.gamesPlayed).padStart(8)}${String(entry.wins).padStart(8)}${(winRate + "%").padStart(8)}${avgVP.padStart(10)}`
    );
  }
  console.log("═".repeat(60));
}
