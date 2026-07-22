/**
 * Run with `LOG_LEVEL=silent pnpm stress` after `pnpm build`; pino logging adds roughly 8x overhead.
 */

const { runGameInBrowser } = await import(
  new URL("../dist/ai/browserRunner.js", import.meta.url).href
);

const parsedCount = Number.parseInt(process.argv[2] ?? "20", 10);
const gameCount = Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : 20;

let ok = 0;
let stall = 0;
const failures = [];
const times = [];
const winners = {};
const stallStages = {};

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = () => {};
console.warn = () => {};
console.error = (...args) => {
  const message = String(args[0]);
  if (message.includes("[RES-FLOW]") || message.includes("[ENUM-EMPTY]")) {
    originalError(...args);
  }
};

for (let index = 0; index < gameCount; index++) {
  const start = Date.now();
  try {
    const record = runGameInBrowser();
    const elapsed = Date.now() - start;
    times.push(elapsed);

    if (record.result) {
      ok++;
      const winner = `P${record.result.winner}`;
      winners[winner] = (winners[winner] ?? 0) + 1;
    } else {
      stall++;
      const diagnostics = record.diagnostics.filter(({ type }) => type === "stall");
      const stages = [...new Set(diagnostics.map(({ phase }) => phase))];
      for (const stage of stages) {
        stallStages[stage] = (stallStages[stage] ?? 0) + 1;
      }
      const lastDecision = record.decisions.at(-1);
      const location = stages.join(", ") || lastDecision?.stage || "unknown";
      const details = diagnostics[0]?.details ?? "No stall diagnostic recorded";
      failures.push(`Game ${index + 1}: ${location} (${elapsed}ms) ${details}`);
    }

    if ((index + 1) % 10 === 0) {
      originalLog(`[${index + 1}/${gameCount}] ${ok} ok, ${stall} fail (last: ${elapsed}ms)`);
    }
  } catch (error) {
    const elapsed = Date.now() - start;
    times.push(elapsed);
    stall++;
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    failures.push(`Game ${index + 1}: exception (${elapsed}ms) ${message}`);
  }
}

console.log = originalLog;
console.warn = originalWarn;
console.error = originalError;

const sortedTimes = [...times].sort((a, b) => a - b);
const averageMs = Math.round(times.reduce((total, value) => total + value, 0) / times.length);
const p95Ms = sortedTimes[Math.max(0, Math.ceil(sortedTimes.length * 0.95) - 1)];
const maxMs = sortedTimes.at(-1);

console.log("\n=== STRESS TEST RESULTS ===");
console.log(`${ok}/${gameCount} OK, ${stall}/${gameCount} FAIL`);
console.log(`Timing: avg=${averageMs}ms, p95=${p95Ms}ms, max=${maxMs}ms`);
console.log(`Winners: ${JSON.stringify(winners)}`);
console.log(`Stall stages: ${JSON.stringify(stallStages)}`);
if (failures.length > 0) {
  console.log("\nFailures:");
  failures.forEach((failure) => console.log(`  ${failure}`));
}
