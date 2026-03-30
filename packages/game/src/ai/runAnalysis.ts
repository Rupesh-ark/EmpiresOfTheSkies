/**
 * CLI entry point: run a single game and print full analysis.
 * Usage: npx ts-node src/ai/runAnalysis.ts [--player <id>] [--moves-only]
 */

import { runSingleGame } from "./selfPlay";
import {
  printFullAnalysis,
  printMoveAnalysis,
} from "./analyzeGameRecord";

const args = process.argv.slice(2);

const movesOnlyFlag = args.includes("--moves-only");

const playerFlagIdx = args.indexOf("--player");
const playerID: string | undefined =
  playerFlagIdx !== -1 ? args[playerFlagIdx + 1] : undefined;

console.log("Running single game...");
const record = runSingleGame(1);

if (movesOnlyFlag) {
  printMoveAnalysis(record, playerID);
} else {
  printFullAnalysis(record);
  if (playerID !== undefined) {
    printMoveAnalysis(record, playerID);
  }
}
