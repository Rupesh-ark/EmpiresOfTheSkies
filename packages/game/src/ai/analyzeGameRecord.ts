/**
 * analyzeGameRecord.ts — CLI analysis printer for GameRecord.
 *
 * Pure functions: take a GameRecord, print formatted output to console.
 * No side effects beyond console.log.
 */

import type { GameRecord, EnrichedDecision } from "./GameRecorder";
import type { PlayerSnapshot } from "./GameRecorder";

// Formatting helpers

const SEP_DOUBLE = "═".repeat(62);
const SEP_SINGLE = "─".repeat(62);

function pad(s: string | number, width: number, right = false): string {
  const str = String(s);
  if (right) return str.padStart(width);
  return str.padEnd(width);
}

function fmtGoldDelta(start: number, end: number): string {
  const delta = end - start;
  const sign = delta >= 0 ? "+" : "";
  return `${start}→${end} (${sign}${delta})`;
}

// Mechanical moves to exclude from display

const NOISE_MOVES = new Set(["confirmAction", "drawFoWCards"]);

// Decision grouping helpers

/**
 * Returns all decisions grouped by round number.
 * Returns a Map<round, EnrichedDecision[]> sorted by round ascending.
 */
function groupByRound(decisions: EnrichedDecision[]): Map<number, EnrichedDecision[]> {
  const map = new Map<number, EnrichedDecision[]>();
  for (const d of decisions) {
    const existing = map.get(d.round) ?? [];
    existing.push(d);
    map.set(d.round, existing);
  }
  // Sort rounds ascending
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

/**
 * For a given round + playerID, return the first and last snapshot.
 * Returns null if no decisions exist for that player in that round.
 */
function getRoundSnapshots(
  decisions: EnrichedDecision[],
  playerID: string
): { first: PlayerSnapshot; last: PlayerSnapshot } | null {
  const playerDecisions = decisions.filter((d) => d.playerID === playerID);
  if (playerDecisions.length === 0) return null;
  return {
    first: playerDecisions[0].snapshot,
    last: playerDecisions[playerDecisions.length - 1].snapshot,
  };
}

// 1. printGameTimeline

export function printGameTimeline(record: GameRecord): void {
  const winner = record.result?.winner ?? "?";
  const winnerPersonality = record.result?.winnerPersonality ?? "?";
  const totalRounds = record.result?.rounds ?? "?";

  console.log("\n" + SEP_DOUBLE);
  console.log(`  GAME TIMELINE — Winner: P${winner} (${winnerPersonality}) — ${totalRounds} Rounds`);
  console.log(SEP_DOUBLE);

  const byRound = groupByRound(record.decisions);

  for (const [round, roundDecisions] of byRound) {
    console.log(`\n── Round ${round} ${"─".repeat(Math.max(0, 54 - String(round).length))}`);

    for (let pid = 0; pid <= 5; pid++) {
      const pidStr = String(pid);
      const personality = record.players[pidStr]?.personality ?? "Unknown";
      const snaps = getRoundSnapshots(roundDecisions, pidStr);

      const label = `P${pidStr} (${personality})`;
      console.log(`\n${label}`);

      if (!snaps) {
        console.log("  (no actions this round)");
        continue;
      }

      const { first, last } = snaps;

      // Line 1: Gold delta, VP, Routes, Factories, Territory
      const goldStr = fmtGoldDelta(first.resources.gold, last.resources.gold);
      const vpStr = `${first.resources.victoryPoints}→${last.resources.victoryPoints}`;
      const fac = `${last.economy.factories}/${last.economy.engagedFactories}`;
      const terr = `${last.territory.outposts}o ${last.territory.colonies}c`;
      console.log(
        `  Gold: ${pad(goldStr, 18)}  VP: ${pad(vpStr, 8)}  Routes: ${last.economy.activeRoutes}  Fac: ${fac}  Territory: ${terr}`
      );

      // Line 2: Buildings and alignment
      const b = last.buildings;
      const align = last.alignment;
      console.log(
        `  cathedrals: ${b.cathedrals}  palaces: ${b.palaces}  shipyards: ${b.shipyards}  heresy: ${align.heresyPosition} (${align.type})`
      );

      // Line 3: FoW cards and fleets
      const fow = last.fowCards;
      console.log(
        `  FoW: ${fow.count} cards (${fow.totalSwords} swords, ${fow.totalShields} shields)  Fleets: ${last.fleetCount} active`
      );

      // Line 4: Moves made this round (exclude noise)
      const moves = roundDecisions
        .filter((d) => d.playerID === pidStr && !NOISE_MOVES.has(d.chosenMove))
        .map((d) => d.chosenMove);
      if (moves.length > 0) {
        console.log(`  Moves: ${moves.join(", ")}`);
      } else {
        console.log("  Moves: (automated)");
      }
    }
  }

  console.log("\n" + SEP_DOUBLE + "\n");
}

// 2. printMoveAnalysis

export function printMoveAnalysis(record: GameRecord, playerID?: string): void {
  const label = playerID
    ? `P${playerID} (${record.players[playerID]?.personality ?? "Unknown"})`
    : "ALL PLAYERS";

  console.log("\n" + SEP_DOUBLE);
  console.log(`  MOVE ANALYSIS — ${label}`);
  console.log(SEP_DOUBLE);

  const decisions = playerID
    ? record.decisions.filter((d) => d.playerID === playerID)
    : record.decisions;

  for (const d of decisions) {
    // Skip mechanical noise
    if (NOISE_MOVES.has(d.chosenMove)) continue;
    if (d.chosenMove === "confirmAction") continue;

    const chosenScore = d.chosenScore !== undefined ? d.chosenScore.toFixed(3) : "?.???";
    const pidLabel = playerID ? "" : `P${d.playerID} `;

    console.log(`\n${pidLabel}R${d.round} ${d.stage}`);
    console.log(
      `  -> ${pad(d.chosenMove, 30)}${pad(chosenScore, 8, true)}   <- CHOSEN`
    );

    // Top alternatives (exclude chosen, up to 3)
    const alternatives = d.topScoredMoves
      .filter((m) => m.move !== d.chosenMove)
      .slice(0, 3);

    for (const alt of alternatives) {
      console.log(
        `     ${pad(alt.move, 30)}${pad(alt.score.toFixed(3), 8, true)}`
      );
    }
  }

  console.log("\n" + SEP_DOUBLE + "\n");
}

// 3. printEconomyTimeline

export function printEconomyTimeline(record: GameRecord): void {
  console.log("\n" + SEP_DOUBLE);
  console.log("  ECONOMY TIMELINE");
  console.log(SEP_DOUBLE);

  // Header
  console.log(
    `${"─".repeat(5)}  ${"─".repeat(16)}  ${"─".repeat(4)}  ${"─".repeat(6)}  ${"─".repeat(12)}  ${"─".repeat(9)}  ${"─".repeat(8)}`
  );
  console.log(
    `${"Round".padEnd(5)}  ${"Player".padEnd(16)}  ${"Gold".padStart(4)}  ${"Routes".padStart(6)}  ${"Fac(engaged)".padEnd(12)}  ${"Territory".padEnd(9)}  ${"Skyships".padStart(8)}`
  );
  console.log(
    `${"─".repeat(5)}  ${"─".repeat(16)}  ${"─".repeat(4)}  ${"─".repeat(6)}  ${"─".repeat(12)}  ${"─".repeat(9)}  ${"─".repeat(8)}`
  );

  const byRound = groupByRound(record.decisions);
  let prevRound = -1;

  for (const [round, roundDecisions] of byRound) {
    if (prevRound !== -1 && prevRound !== round) {
      console.log(""); // blank line between rounds
    }
    prevRound = round;

    for (let pid = 0; pid <= 5; pid++) {
      const pidStr = String(pid);
      const personality = record.players[pidStr]?.personality ?? "Unknown";
      const snaps = getRoundSnapshots(roundDecisions, pidStr);

      if (!snaps) continue;

      const last = snaps.last;
      const goldStr = pad(last.resources.gold, 4, true);
      const routesStr = pad(last.economy.activeRoutes, 6, true);
      const facStr = `${last.economy.factories} (${last.economy.engagedFactories})`.padEnd(12);
      const terrStr = `${last.territory.outposts}o ${last.territory.colonies}c`.padEnd(9);
      const skyStr = pad(last.resources.skyships, 8, true);
      const playerLabel = `P${pidStr} ${personality}`.padEnd(16);
      const roundStr = pad(round, 5, true);

      console.log(
        `${roundStr}  ${playerLabel}  ${goldStr}  ${routesStr}  ${facStr}  ${terrStr}  ${skyStr}`
      );
    }
  }

  console.log("\n" + SEP_DOUBLE + "\n");
}

// 4. printBattleLog

export function printBattleLog(record: GameRecord): void {
  const battleDecisions = record.decisions.filter((d) => d.battleContext != null);

  console.log("\n" + SEP_DOUBLE);
  console.log(`  BATTLE LOG — ${battleDecisions.length} battles`);
  console.log(SEP_DOUBLE);

  if (battleDecisions.length === 0) {
    return;
  }

  // Column headers
  console.log(
    `${"Rnd".padEnd(4)} ${"Players".padEnd(12)} ${"Strength".padEnd(14)} ${"Ratio".padEnd(7)} ${"Thresh".padEnd(8)} ${"Decision".padEnd(14)} ${"FoW"}`
  );
  console.log(SEP_SINGLE);

  for (const d of battleDecisions) {
    const bc = d.battleContext!;
    const players = `P${d.playerID} vs P${bc.targetID}`.padEnd(12);
    const strengthStr = `${bc.myStrength.toFixed(1)} vs ${bc.enemyStrength.toFixed(1)}`.padEnd(14);
    const ratioStr = bc.ratio.toFixed(2).padEnd(7);
    const threshStr = bc.threshold.toFixed(2).padEnd(8);
    const decisionStr = bc.decision.padEnd(14);
    const fowStr = String(bc.fowCardCount);

    console.log(
      `R${String(d.round).padEnd(3)} ${players} Strength: ${strengthStr} Ratio: ${ratioStr} Threshold: ${threshStr} -> ${decisionStr} FoW: ${fowStr}`
    );
  }

  console.log("\n" + SEP_DOUBLE + "\n");
}

// 5. printFullAnalysis

/**
 * Convenience function that prints game timeline, economy timeline, and battle
 * log. Move analysis is excluded here because it is very verbose — call
 * printMoveAnalysis separately with a specific playerID.
 */
export function printFullAnalysis(record: GameRecord): void {
  printGameTimeline(record);
  printEconomyTimeline(record);
  printBattleLog(record);
}
