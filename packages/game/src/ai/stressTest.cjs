/**
 * Stress test: run N games in-process (each gets a unique matchID).
 * Usage: node src/ai/stressTest.cjs [count]
 *   e.g. node src/ai/stressTest.cjs 100
 */
const { runGameInBrowser } = require("../../dist/cjs/ai/browserRunner");

const count = parseInt(process.argv[2]) || 50;

let ok = 0, stall = 0;
const failures = [];
const times = [];
const winners = {};

// Suppress game logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = (...args) => {
  // Keep RES-FLOW and ENUM-EMPTY for debugging
  const s = String(args[0]);
  if (s.includes("[RES-FLOW]") || s.includes("[ENUM-EMPTY]") || s.includes("[BATTLE-CHECK]")) {
    origError.apply(console, args);
  }
};

for (let i = 0; i < count; i++) {
  const start = Date.now();
  const r = runGameInBrowser();
  const ms = Date.now() - start;
  times.push(ms);

  if (r.result) {
    ok++;
    const w = "P" + r.result.winner;
    winners[w] = (winners[w] || 0) + 1;
  } else {
    stall++;
    const last = r.decisions[r.decisions.length - 1];
    const stalls = r.diagnostics.filter((d) => d.type === "stall");
    const detail = (last?.stage || "?") + "/" + (last?.chosenMove || "?");
    failures.push(`Game ${i + 1}: ${detail} (${ms}ms) ${stalls[0]?.details?.slice(0, 60) || ""}`);
  }

  if ((i + 1) % 10 === 0) {
    origLog(`[${i + 1}/${count}] ${ok} ok, ${stall} fail (last: ${ms}ms)`);
  }
}

// Restore
console.log = origLog;
console.warn = origWarn;
console.error = origError;

const avgMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
const maxMs = Math.max(...times);
const sorted = [...times].sort((a, b) => a - b);
const p95 = sorted[Math.floor(sorted.length * 0.95)];

console.log("\n=== STRESS TEST RESULTS ===");
console.log(`${ok}/${count} OK, ${stall}/${count} FAIL`);
console.log(`Timing: avg=${avgMs}ms, p95=${p95}ms, max=${maxMs}ms`);
console.log(`Winners: ${JSON.stringify(winners)}`);
if (failures.length > 0) {
  console.log(`\nFailures:`);
  failures.forEach((f) => console.log(`  ${f}`));
}
