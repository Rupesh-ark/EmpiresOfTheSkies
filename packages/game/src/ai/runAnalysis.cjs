/**
 * CLI tool: run a game and save the GameRecord JSON to analytics/.
 *
 * Usage:
 *   node src/ai/runAnalysis.cjs
 *   node src/ai/runAnalysis.cjs --games 3
 *   node src/ai/runAnalysis.cjs --out /tmp/game.json
 */
const fs = require("fs");
const path = require("path");
const { runGameInBrowser } = require("../../dist/cjs/ai/browserRunner");

const args = process.argv.slice(2);
const numGames = parseInt(args[args.indexOf("--games") + 1]) || 1;
const outDir = args.includes("--out")
  ? path.dirname(args[args.indexOf("--out") + 1])
  : path.join(__dirname, "analytics");
const outFile = args.includes("--out")
  ? args[args.indexOf("--out") + 1]
  : undefined;

fs.mkdirSync(outDir, { recursive: true });

for (let i = 0; i < numGames; i++) {
  const record = runGameInBrowser();
  const filename = outFile ?? path.join(outDir, `game_${Date.now()}_${i + 1}.json`);
  fs.writeFileSync(filename, JSON.stringify(record, null, 2));

  const r = record.result;
  const scores = r ? Object.entries(r.scores).map(([p, v]) => `P${p}:${v ?? "?"}`).join(" ") : "incomplete";
  console.log(`Game ${i + 1}: ${r ? `Winner P${r.winner} (${r.winnerPersonality}) ${r.rounds}R` : "incomplete"} | ${scores}`);
  console.log(`  → ${filename}`);
}
