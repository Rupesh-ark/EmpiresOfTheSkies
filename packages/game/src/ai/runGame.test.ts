/**
 * CLI game runner — generates a GameRecord JSON for the AI Tuner dashboard.
 *
 * Usage:
 *   cd packages/game && npx vitest run src/ai/runGame.test.ts
 *
 * Output:
 *   Writes game_record.json to packages/game/ (importable in AI Tuner)
 *
 * Options (via environment variables):
 *   MCTS_SIMS=50       Simulations per move (default: 20)
 *   MCTS_DEPTH=2       Rollout depth (default: 1)
 *   MCTS_C=1.4         Exploration constant (default: 1.4)
 */
import { describe, it } from "vitest";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { runSingleGame } from "./selfPlay";
import { setMCTSConfig, resetMCTSConfig } from "./mcts/config";

describe("generate game record", () => {
  it(
    "runs a single game and writes game_record.json",
    () => {
      // Apply MCTS config from environment
      const sims = parseInt(process.env.MCTS_SIMS ?? "20");
      const depth = parseInt(process.env.MCTS_DEPTH ?? "1");
      const c = parseFloat(process.env.MCTS_C ?? "1.4");
      setMCTSConfig({ simulationsPerMove: sims, rolloutDepth: depth, explorationConstant: c });

      console.log(`\nMCTS config: sims=${sims}, depth=${depth}, C=${c}`);
      console.log("Running game...\n");

      const startTime = Date.now();
      const record = runSingleGame(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Write to packages/game/src/ai/analytics/
      const outPath = resolve(__dirname, `analytics/game_mcts_${Date.now()}.json`);
      writeFileSync(outPath, JSON.stringify(record, null, 2));

      console.log(`\nGame complete in ${elapsed}s`);
      if (record.result) {
        console.log(`Winner: P${record.result.winner} (${record.result.winnerPersonality})`);
        console.log(`Rounds: ${record.result.rounds}`);
        console.log(`Decisions: ${record.decisions.length}`);
        console.log(`MCTS decisions: ${record.decisions.filter(d => d.mctsStats).length}`);
        console.log("\nRankings:");
        for (const r of record.result.rankings) {
          console.log(`  P${r.playerID} ${r.personality}: ${r.vp} VP`);
        }
      }
      console.log(`\nOutput: ${outPath}`);

      // Reset config
      resetMCTSConfig();
    },
    120_000,
  );
});
