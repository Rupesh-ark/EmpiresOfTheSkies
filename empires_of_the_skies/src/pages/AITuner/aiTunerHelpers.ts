import { tokens } from "../../theme/tokens";
import type { GameRecord } from "@eots/game";

export { tokens };

export const PLAYER_COLORS = [
  tokens.kingdom.angland,
  tokens.kingdom.constantium,
  tokens.kingdom.nordmark,
  tokens.kingdom.gallois,
  tokens.kingdom.castillia,
  "#7B68A0",
];

const NOISE_MOVES = new Set(["confirmAction", "drawFoWCards", "discardFoWCard"]);

export function getVPProgression(record: GameRecord | null) {
  if (!record || record.roundSummaries.length === 0) {
    if (!record) return { rounds: [], series: [] };

    const playerRounds: Record<string, Record<number, number>> = {};
    for (const d of record.decisions) {
      if (!playerRounds[d.playerID]) playerRounds[d.playerID] = {};
      playerRounds[d.playerID][d.round] = d.snapshot.vpStanding.mine;
    }

    const allRounds = [...new Set(record.decisions.map((d) => d.round))].sort((a, b) => a - b);
    if (allRounds.length === 0) return { rounds: [], series: [] };

    const series = Object.keys(playerRounds).map((pid) => ({
      label: `P${pid}`,
      data: allRounds.map((r) => playerRounds[pid][r] ?? 0),
    }));

    return { rounds: allRounds, series };
  }

  const rounds = record.roundSummaries.map((rs) => rs.round);
  const playerIDs = record.roundSummaries[0]?.standings.map((s) => s.playerID) ?? [];

  const series = playerIDs.map((pid) => ({
    label: `P${pid}`,
    data: record.roundSummaries.map(
      (rs) => rs.standings.find((s) => s.playerID === pid)?.vp ?? 0
    ),
  }));

  return { rounds, series };
}

export function getEconomyCurves(record: GameRecord | null, playerFilter: string) {
  if (!record) return { rounds: [], series: [] };

  if (playerFilter !== "all") {
    const decisions = record.decisions.filter((d) => d.playerID === playerFilter);
    const roundData: Record<number, (typeof decisions)[0]["snapshot"]> = {};
    for (const d of decisions) roundData[d.round] = d.snapshot;
    const rounds = Object.keys(roundData).map(Number).sort((a, b) => a - b);
    if (rounds.length === 0) return { rounds: [], series: [] };
    return {
      rounds,
      series: [
        { label: "Gold", data: rounds.map((r) => roundData[r].resources.gold) },
        { label: "Active Routes", data: rounds.map((r) => roundData[r].economy.activeRoutes) },
        { label: "Engaged Factories", data: rounds.map((r) => roundData[r].economy.engagedFactories) },
      ],
    };
  }

  const playerIDs = [...new Set(record.decisions.map((d) => d.playerID))].sort();
  const allRounds = [...new Set(record.decisions.map((d) => d.round))].sort((a, b) => a - b);
  return {
    rounds: allRounds,
    series: playerIDs.map((pid) => {
      const roundData: Record<number, (typeof record.decisions)[0]["snapshot"]> = {};
      for (const d of record.decisions.filter((d) => d.playerID === pid)) roundData[d.round] = d.snapshot;
      return { label: `P${pid} Gold`, data: allRounds.map((r) => roundData[r]?.resources.gold ?? 0) };
    }),
  };
}

export function getBuildingCurves(record: GameRecord | null, playerFilter: string) {
  if (!record) return { rounds: [], series: [] };

  if (playerFilter !== "all") {
    const decisions = record.decisions.filter((d) => d.playerID === playerFilter);
    const roundData: Record<number, (typeof decisions)[0]["snapshot"]> = {};
    for (const d of decisions) roundData[d.round] = d.snapshot;
    const rounds = Object.keys(roundData).map(Number).sort((a, b) => a - b);
    if (rounds.length === 0) return { rounds: [], series: [] };
    return {
      rounds,
      series: [
        { label: "Outposts", data: rounds.map((r) => roundData[r].territory.outposts) },
        { label: "Colonies", data: rounds.map((r) => roundData[r].territory.colonies) },
        { label: "Cathedrals", data: rounds.map((r) => roundData[r].buildings.cathedrals) },
        { label: "Palaces", data: rounds.map((r) => roundData[r].buildings.palaces) },
        { label: "Factories", data: rounds.map((r) => roundData[r].factories) },
      ],
    };
  }

  const playerIDs = [...new Set(record.decisions.map((d) => d.playerID))].sort();
  const allRounds = [...new Set(record.decisions.map((d) => d.round))].sort((a, b) => a - b);
  return {
    rounds: allRounds,
    series: playerIDs.map((pid) => {
      const roundData: Record<number, (typeof record.decisions)[0]["snapshot"]> = {};
      for (const d of record.decisions.filter((d) => d.playerID === pid)) roundData[d.round] = d.snapshot;
      return {
        label: `P${pid} Territory`,
        data: allRounds.map((r) => (roundData[r]?.territory.outposts ?? 0) + (roundData[r]?.territory.colonies ?? 0)),
      };
    }),
  };
}

export function getMilitaryCurves(record: GameRecord | null, playerFilter: string) {
  if (!record) return { rounds: [], series: [] };

  if (playerFilter !== "all") {
    const decisions = record.decisions.filter((d) => d.playerID === playerFilter);
    const roundData: Record<number, (typeof decisions)[0]["snapshot"]> = {};
    for (const d of decisions) roundData[d.round] = d.snapshot;
    const rounds = Object.keys(roundData).map(Number).sort((a, b) => a - b);
    if (rounds.length === 0) return { rounds: [], series: [] };
    return {
      rounds,
      series: [
        { label: "Regiments+Elites", data: rounds.map((r) => roundData[r].resources.regiments + roundData[r].resources.eliteRegiments) },
        { label: "Levies", data: rounds.map((r) => roundData[r].resources.levies) },
        { label: "Skyships", data: rounds.map((r) => roundData[r].resources.skyships) },
        { label: "Heresy Position", data: rounds.map((r) => roundData[r].alignment.heresyPosition) },
      ],
    };
  }

  const playerIDs = [...new Set(record.decisions.map((d) => d.playerID))].sort();
  const allRounds = [...new Set(record.decisions.map((d) => d.round))].sort((a, b) => a - b);
  return {
    rounds: allRounds,
    series: playerIDs.map((pid) => {
      const roundData: Record<number, (typeof record.decisions)[0]["snapshot"]> = {};
      for (const d of record.decisions.filter((d) => d.playerID === pid)) roundData[d.round] = d.snapshot;
      return {
        label: `P${pid} Military`,
        data: allRounds.map((r) => {
          const s = roundData[r];
          return s ? s.resources.regiments + s.resources.eliteRegiments + s.resources.skyships : 0;
        }),
      };
    }),
  };
}

export function getFilteredDecisions(
  record: GameRecord | null,
  round: number | "all",
  playerFilter: string,
  phase: string
) {
  if (!record) return [];

  return record.decisions
    .filter((d) => !NOISE_MOVES.has(d.chosenMove))
    .filter((d) => round === "all" || d.round === round)
    .filter((d) => playerFilter === "all" || d.playerID === playerFilter)
    .filter((d) => {
      if (phase === "all") return true;
      return d.stage.startsWith(phase + "/") || d.stage === phase || d.phase === phase;
    });
}

export function getMovesByRound(record: GameRecord | null, playerFilter: string) {
  if (!record) return { rounds: [], series: [] };

  const decisions = record.decisions
    .filter((d) => !NOISE_MOVES.has(d.chosenMove))
    .filter((d) => playerFilter === "all" || d.playerID === playerFilter);

  if (decisions.length === 0) return { rounds: [], series: [] };

  const roundMoveCount: Record<number, Record<string, number>> = {};
  const moveTotals: Record<string, number> = {};

  for (const d of decisions) {
    if (!roundMoveCount[d.round]) roundMoveCount[d.round] = {};
    roundMoveCount[d.round][d.chosenMove] = (roundMoveCount[d.round][d.chosenMove] ?? 0) + 1;
    moveTotals[d.chosenMove] = (moveTotals[d.chosenMove] ?? 0) + 1;
  }

  const rounds = Object.keys(roundMoveCount).map(Number).sort((a, b) => a - b);

  const top8 = Object.entries(moveTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([move]) => move);
  const topSet = new Set(top8);

  const seriesMoves = [...top8, "Other"];
  const series = seriesMoves.map((moveName) => ({
    label: moveName,
    data: rounds.map((r) => {
      const counts = roundMoveCount[r] ?? {};
      if (moveName === "Other") {
        return Object.entries(counts)
          .filter(([m]) => !topSet.has(m))
          .reduce((sum, [, c]) => sum + c, 0);
      }
      return counts[moveName] ?? 0;
    }),
    stack: "total",
  }));

  return { rounds, series };
}

export function getDecisionQuality(record: GameRecord | null, playerFilter: string) {
  if (!record) return { rounds: [], series: [] };

  const decisions = record.decisions
    .filter((d) => !NOISE_MOVES.has(d.chosenMove))
    .filter((d) => d.chosenScore !== undefined && d.chosenScore !== 0);

  if (decisions.length === 0) return { rounds: [], series: [] };

  const allRounds = [...new Set(decisions.map((d) => d.round))].sort((a, b) => a - b);

  if (playerFilter !== "all") {
    const playerDecisions = decisions.filter((d) => d.playerID === playerFilter);
    const roundAvg: Record<number, number[]> = {};
    for (const d of playerDecisions) {
      if (!roundAvg[d.round]) roundAvg[d.round] = [];
      roundAvg[d.round].push(d.chosenScore!);
    }
    const relevantRounds = allRounds.filter((r) => roundAvg[r]);
    return {
      rounds: relevantRounds,
      series: [{
        label: `P${playerFilter}`,
        data: relevantRounds.map((r) => {
          const vals = roundAvg[r] ?? [];
          return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        }),
      }],
    };
  }

  const playerIDs = [...new Set(decisions.map((d) => d.playerID))].sort();
  const series = playerIDs.map((pid) => {
    const playerDecisions = decisions.filter((d) => d.playerID === pid);
    const roundAvg: Record<number, number[]> = {};
    for (const d of playerDecisions) {
      if (!roundAvg[d.round]) roundAvg[d.round] = [];
      roundAvg[d.round].push(d.chosenScore!);
    }
    return {
      label: `P${pid}`,
      data: allRounds.map((r) => {
        const vals = roundAvg[r] ?? [];
        return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      }),
    };
  });

  return { rounds: allRounds, series };
}

export function getEvalVsMCTS(record: GameRecord | null, playerFilter: string) {
  if (!record) return { evalDist: [], mctsDist: [] };

  const decisions = record.decisions.filter(
    (d) =>
      d.mctsStats &&
      (playerFilter === "all" || d.playerID === playerFilter) &&
      !NOISE_MOVES.has(d.chosenMove)
  );

  const evalCounts: Record<string, number> = {};
  const mctsCounts: Record<string, number> = {};

  for (const d of decisions) {
    const evalTop = d.mctsStats!.evaluatorTopMove;
    evalCounts[evalTop] = (evalCounts[evalTop] ?? 0) + 1;
    mctsCounts[d.chosenMove] = (mctsCounts[d.chosenMove] ?? 0) + 1;
  }

  const toArray = (counts: Record<string, number>) =>
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], id) => ({ id, value, label }));

  return { evalDist: toArray(evalCounts), mctsDist: toArray(mctsCounts) };
}

export function getQualityDistribution(record: GameRecord | null, playerFilter: string) {
  if (!record) return { buckets: [] as string[], data: [] as number[] };

  const decisions = record.decisions.filter(
    (d) =>
      d.mctsStats &&
      (playerFilter === "all" || d.playerID === playerFilter)
  );

  const bucketCounts = new Array(10).fill(0) as number[];
  const bucketLabels = Array.from({ length: 10 }, (_, i) => `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`);

  for (const d of decisions) {
    for (const child of d.mctsStats!.children) {
      const bucket = Math.min(9, Math.floor(child.quality * 10));
      bucketCounts[bucket]++;
    }
  }

  return { buckets: bucketLabels, data: bucketCounts };
}

export interface MoveQualityRow {
  move: string;
  avgQuality: number;
  timesEvaluated: number;
  timesChosen: number;
  chooseRate: number;
  avgReward: number;
  delta: number;
}

export function getPerMoveQuality(record: GameRecord | null, playerFilter: string): MoveQualityRow[] {
  if (!record) return [];

  const decisions = record.decisions.filter(
    (d) =>
      d.mctsStats &&
      (playerFilter === "all" || d.playerID === playerFilter)
  );

  const moveAgg: Record<string, {
    totalQuality: number;
    totalReward: number;
    totalVisits: number;
    evaluated: number;
    chosen: number;
  }> = {};

  for (const d of decisions) {
    for (const child of d.mctsStats!.children) {
      if (!moveAgg[child.move]) {
        moveAgg[child.move] = { totalQuality: 0, totalReward: 0, totalVisits: 0, evaluated: 0, chosen: 0 };
      }
      const agg = moveAgg[child.move];
      agg.totalQuality += child.quality;
      agg.totalReward += child.avgReward * child.visits;
      agg.totalVisits += child.visits;
      agg.evaluated++;
      if (child.move === d.chosenMove) agg.chosen++;
    }
  }

  return Object.entries(moveAgg)
    .map(([move, agg]) => {
      const avgQ = agg.evaluated > 0 ? agg.totalQuality / agg.evaluated : 0;
      const avgR = agg.totalVisits > 0 ? agg.totalReward / agg.totalVisits : 0;
      return {
        move,
        avgQuality: avgQ,
        timesEvaluated: agg.evaluated,
        timesChosen: agg.chosen,
        chooseRate: agg.evaluated > 0 ? agg.chosen / agg.evaluated : 0,
        avgReward: avgR,
        delta: avgR - avgQ,
      };
    })
    .sort((a, b) => b.timesChosen - a.timesChosen);
}

export interface MCTSSummary {
  totalDecisions: number;
  mctsDecisions: number;
  overrideCount: number;
  overrideRate: number;
  avgSimulations: number;
  avgTimeMs: number;
  moveStats: { move: string; chosen: number; avgVisits: number; avgReward: number; avgQuality: number }[];
  details: {
    round: number;
    playerID: string;
    chosenMove: string;
    avgReward: number;
    evaluatorTop: string;
    overrode: boolean;
    simulations: number;
    timeMs: number;
    children: { move: string; visits: number; avgReward: number; quality: number }[];
  }[];
}

export function getMCTSSummary(record: GameRecord | null, playerFilter: string): MCTSSummary {
  const empty: MCTSSummary = {
    totalDecisions: 0, mctsDecisions: 0, overrideCount: 0, overrideRate: 0,
    avgSimulations: 0, avgTimeMs: 0, moveStats: [], details: [],
  };
  if (!record) return empty;

  const decisions = record.decisions.filter(
    (d) => (playerFilter === "all" || d.playerID === playerFilter) && d.mctsStats
  );

  if (decisions.length === 0) return { ...empty, totalDecisions: record.decisions.length };

  const overrides = decisions.filter((d) => d.mctsStats!.overrodeEvaluator);
  const totalSims = decisions.reduce((s, d) => s + d.mctsStats!.simulations, 0);
  const totalTime = decisions.reduce((s, d) => s + d.mctsStats!.timeMs, 0);

  const moveAgg: Record<string, { chosen: number; totalVisits: number; totalReward: number; totalQuality: number; count: number }> = {};
  for (const d of decisions) {
    for (const c of d.mctsStats!.children) {
      if (!moveAgg[c.move]) moveAgg[c.move] = { chosen: 0, totalVisits: 0, totalReward: 0, totalQuality: 0, count: 0 };
      const agg = moveAgg[c.move];
      agg.totalVisits += c.visits;
      agg.totalReward += c.avgReward * c.visits;
      agg.totalQuality += c.quality;
      agg.count++;
      if (c.move === d.chosenMove) agg.chosen++;
    }
  }

  const moveStats = Object.entries(moveAgg)
    .map(([move, agg]) => ({
      move,
      chosen: agg.chosen,
      avgVisits: agg.count > 0 ? agg.totalVisits / agg.count : 0,
      avgReward: agg.totalVisits > 0 ? agg.totalReward / agg.totalVisits : 0,
      avgQuality: agg.count > 0 ? agg.totalQuality / agg.count : 0,
    }))
    .sort((a, b) => b.chosen - a.chosen);

  const details = decisions.map((d) => ({
    round: d.round,
    playerID: d.playerID,
    chosenMove: d.chosenMove,
    avgReward: d.mctsStats!.children.find((c) => c.move === d.chosenMove)?.avgReward ?? 0,
    evaluatorTop: d.mctsStats!.evaluatorTopMove,
    overrode: d.mctsStats!.overrodeEvaluator,
    simulations: d.mctsStats!.simulations,
    timeMs: d.mctsStats!.timeMs,
    children: d.mctsStats!.children,
  }));

  return {
    totalDecisions: record.decisions.length,
    mctsDecisions: decisions.length,
    overrideCount: overrides.length,
    overrideRate: decisions.length > 0 ? overrides.length / decisions.length : 0,
    avgSimulations: decisions.length > 0 ? totalSims / decisions.length : 0,
    avgTimeMs: decisions.length > 0 ? totalTime / decisions.length : 0,
    moveStats,
    details,
  };
}
