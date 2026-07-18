#!/usr/bin/env ts-node
/**
 * Tournament CLI runner.
 *
 * Usage:
 *   cd packages/game
 *
 *   # A/B test: two weight configs
 *   npx ts-node src/ai/runTournament.ts --mode ab --games 200 \
 *     --weights-a '{"territory":0.15,"economy":0.20,"military":0.25,"religion":0.10,"legacy":0.10,"positioning":0.08,"threats":0.07,"republicAccess":0.05}' \
 *     --weights-b '{"territory":0.125,"economy":0.125,"military":0.125,"religion":0.125,"legacy":0.125,"positioning":0.125,"threats":0.125,"republicAccess":0.125}'
 *
 *   # Hill climb: auto-tune
 *   npx ts-node src/ai/runTournament.ts --mode hillclimb --games-per-step 50 --max-iterations 20 --step-size 0.03 --tune military,economy,religion
 *
 *   # League: round-robin from config file
 *   npx ts-node src/ai/runTournament.ts --mode league --games-per-pair 100 --entries-file ./weight-configs.json
 */
import * as fs from "fs";
import * as path from "path";
import type { AIWeights } from "./types.js";
import {
  runTournament,
  runHillClimb,
  runLeague,
  printTournamentResult,
  printHillClimbResult,
  printLeagueResult,
} from "./tournament.js";

const args = process.argv.slice(2);

function getArg(name: string, defaultValue: string): string {
  const idx = args.indexOf(name);
  if (idx === -1 || idx + 1 >= args.length) return defaultValue;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

const BALANCED: AIWeights = {
  territory: 0.125, economy: 0.125, military: 0.125, religion: 0.125,
  legacy: 0.125, positioning: 0.125, threats: 0.125, republicAccess: 0.125,
};

const mode = getArg("--mode", "ab");

const resultsDir = path.join(__dirname, "tournament-results");
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

if (mode === "ab") {
  const games = parseInt(getArg("--games", "100"));
  const weightsAStr = getArg("--weights-a", JSON.stringify(BALANCED));
  const weightsBStr = getArg("--weights-b", JSON.stringify(BALANCED));
  const nameA = getArg("--name-a", "Config_A");
  const nameB = getArg("--name-b", "Config_B");

  let weightsA: AIWeights;
  let weightsB: AIWeights;
  try {
    weightsA = JSON.parse(weightsAStr);
    weightsB = JSON.parse(weightsBStr);
  } catch (e) {
    console.error("Failed to parse weights JSON. Use format: '{\"territory\":0.125,...}'");
    process.exit(1);
  }

  console.log(`\nA/B Test: ${nameA} vs ${nameB} (${games} games)\n`);

  const startTime = Date.now();
  const result = runTournament({
    name: `${nameA} vs ${nameB}`,
    weightSets: [
      { name: nameA, weights: weightsA },
      { name: nameB, weights: weightsB },
    ],
    gamesPerMatchup: games,
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Completed in ${elapsed}s`);
  printTournamentResult(result);

  const outPath = path.join(resultsDir, `ab-${timestamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Results saved to ${outPath}`);

} else if (mode === "hillclimb") {
  const gamesPerStep = parseInt(getArg("--games-per-step", "50"));
  const maxIterations = parseInt(getArg("--max-iterations", "20"));
  const stepSize = parseFloat(getArg("--step-size", "0.03"));
  const tuneStr = getArg("--tune", "military,economy,territory,religion");
  const dimensions = tuneStr.split(",").map((s) => s.trim()) as (keyof AIWeights)[];

  const baseStr = getArg("--base-weights", JSON.stringify(BALANCED));
  let baseWeights: AIWeights;
  try {
    baseWeights = JSON.parse(baseStr);
  } catch {
    baseWeights = BALANCED;
  }

  console.log(`\nHill Climb: tuning [${dimensions.join(", ")}] (${gamesPerStep} games/step, max ${maxIterations} iters)\n`);

  const startTime = Date.now();
  const result = runHillClimb({
    baseWeights,
    dimensions,
    stepSize,
    gamesPerStep,
    maxIterations,
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Completed in ${elapsed}s (${result.totalGamesPlayed} total games)`);
  printHillClimbResult(result);

  const outPath = path.join(resultsDir, `hillclimb-${timestamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Results saved to ${outPath}`);

} else if (mode === "league") {
  const gamesPerPair = parseInt(getArg("--games-per-pair", "50"));
  const entriesFile = getArg("--entries-file", "");

  let entries: Array<{ name: string; weights: AIWeights }>;

  if (entriesFile) {
    try {
      const raw = fs.readFileSync(entriesFile, "utf-8");
      const parsed = JSON.parse(raw);
      entries = parsed.entries;
    } catch (e) {
      console.error(`Failed to read entries file: ${entriesFile}`);
      process.exit(1);
    }
  } else {
    // Default: balanced vs military vs economy vs religion
    entries = [
      { name: "balanced", weights: BALANCED },
      { name: "military_heavy", weights: { ...BALANCED, military: 0.30, economy: 0.10, threats: 0.10 } },
      { name: "economy_focus", weights: { ...BALANCED, economy: 0.28, military: 0.10 } },
      { name: "religion_heavy", weights: { ...BALANCED, religion: 0.30, military: 0.10, threats: 0.05 } },
    ];
  }

  console.log(`\nLeague: ${entries.length} entries, ${gamesPerPair} games/pair\n`);

  const startTime = Date.now();
  const result = runLeague({ entries, gamesPerPairing: gamesPerPair });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Completed in ${elapsed}s`);
  printLeagueResult(result);

  const outPath = path.join(resultsDir, `league-${timestamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Results saved to ${outPath}`);

} else {
  console.error(`Unknown mode: ${mode}. Use --mode ab|hillclimb|league`);
  process.exit(1);
}
