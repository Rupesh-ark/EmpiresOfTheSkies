#!/usr/bin/env ts-node
/**
 * Balance test runner — execute from project root:
 *   cd packages/game && npx ts-node src/ai/runBalanceTest.ts --games 100
 *
 * Options:
 *   --games N        Number of games to run (default: 10)
 *   --verbose        Print per-game results (default: silent)
 *   --json           Output raw JSON instead of formatted report
 */
import { runSelfPlay, printBalanceReport } from "./selfPlay";

const args = process.argv.slice(2);

function getArg(name: string, defaultValue: string): string {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return defaultValue;
  return args[idx + 1];
}

const numGames = parseInt(getArg("--games", "10"));
const quiet = !args.includes("--verbose");
const jsonOutput = args.includes("--json");

console.log(`\nRunning ${numGames} self-play games (6 bots each)...\n`);

const startTime = Date.now();
const report = runSelfPlay(numGames, quiet);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`Completed in ${elapsed}s (${(parseFloat(elapsed) / numGames).toFixed(2)}s/game)`);

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printBalanceReport(report);
}
