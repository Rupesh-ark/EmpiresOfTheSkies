/**
 * CLI entry point: run a single game and print full analysis.
 * Usage: node dist/cjs/ai/runAnalysis.js [--player <id>] [--moves-only] [--json <path>] [--games <n>]
 */

import * as fs from "fs";
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

const jsonFlagIdx = args.indexOf("--json");
const jsonPath: string | undefined =
  jsonFlagIdx !== -1 ? args[jsonFlagIdx + 1] : undefined;

function makeOutputPath(base: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = base.endsWith(".json") ? "" : ".json";
  const name = base.replace(/\.json$/, "");
  return `${name}_${ts}_${rand}${ext}.json`;
}

const gamesFlagIdx = args.indexOf("--games");
const numGames = gamesFlagIdx !== -1 ? parseInt(args[gamesFlagIdx + 1], 10) : 1;

const records = [];
for (let i = 0; i < numGames; i++) {
  console.log(`Running game ${i + 1}/${numGames}...`);
  records.push(runSingleGame(i + 1));
}

const record = records[records.length - 1];

if (movesOnlyFlag) {
  printMoveAnalysis(record, playerID);
} else {
  printFullAnalysis(record);
  if (playerID !== undefined) {
    printMoveAnalysis(record, playerID);
  }
}

if (jsonPath) {
  const output = numGames === 1 ? records[0] : records;
  const finalPath = makeOutputPath(jsonPath);
  fs.writeFileSync(finalPath, JSON.stringify(output, null, 2));
  console.log(`\nGame record(s) saved to: ${finalPath}`);
}
