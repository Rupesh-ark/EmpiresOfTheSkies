import type { MyGameState } from "../types.js";
import type { AIWeights } from "./types.js";
import type { ResourceSnapshot, DecisionLogEntry, RoundSummaryEntry } from "./AILogger.js";
import { countActiveTradeRoutes } from "../helpers/mapUtils.js";

// Player snapshot at a decision point

export interface PlayerSnapshot {
  resources: ResourceSnapshot;
  territory: { outposts: number; colonies: number; forts: number };
  vpStanding: { mine: number; leader: number; rank: number };
  fleetCount: number;
  factories: number;
  freeDissenters: number;
  economy: { activeRoutes: number; factories: number; engagedFactories: number };
  buildings: { cathedrals: number; palaces: number; shipyards: number };
  alignment: { heresyPosition: number; type: string };
  fowCards: { count: number; totalSwords: number; totalShields: number };
  fleetPositions: { x: number; y: number }[];
}

// Snapshot builder

export function captureSnapshot(G: MyGameState, playerID: string): PlayerSnapshot {
  const player = G.playerInfo[playerID];
  const allVPs = Object.values(G.playerInfo).map((p) => p.resources.victoryPoints);
  const sortedVPs = [...allVPs].sort((a, b) => b - a);
  const myVP = player.resources.victoryPoints;

  let outposts = 0;
  let colonies = 0;
  let forts = 0;
  G.mapState.buildings.forEach((row) => {
    row.forEach((cell) => {
      if (cell.buildings === "outpost" && cell.player?.id === playerID) outposts++;
      if (cell.buildings === "colony" && cell.player?.id === playerID) colonies++;
      if (cell.fort.includes(playerID)) forts++;
    });
  });

  const activeRoutes = countActiveTradeRoutes(G, playerID);
  const engagedFactories = Math.min(player.factories, activeRoutes);

  const fowCards = player.resources.fortuneCards;
  const fowCardCount = fowCards.length;
  const fowTotalSwords = fowCards.reduce((sum, c) => sum + c.sword, 0);
  const fowTotalShields = fowCards.reduce((sum, c) => sum + c.shield, 0);

  const fleetPositions = player.fleetInfo
    .filter((f) => f.skyships > 0)
    .map((f) => ({ x: f.location[0], y: f.location[1] }));

  return {
    resources: {
      gold: player.resources.gold,
      victoryPoints: myVP,
      counsellors: player.resources.counsellors,
      skyships: player.resources.skyships,
      regiments: player.resources.regiments,
      levies: player.resources.levies,
      eliteRegiments: player.resources.eliteRegiments,
    },
    territory: { outposts, colonies, forts },
    vpStanding: {
      mine: myVP,
      leader: Math.max(...allVPs),
      rank: sortedVPs.indexOf(myVP) + 1,
    },
    fleetCount: player.fleetInfo.filter((f) => f.skyships > 0).length,
    factories: player.factories,
    freeDissenters: player.freeDissenters,
    economy: { activeRoutes, factories: player.factories, engagedFactories },
    buildings: {
      cathedrals: player.cathedrals,
      palaces: player.palaces,
      shipyards: player.shipyards,
    },
    alignment: {
      heresyPosition: player.heresyTracker,
      type: player.hereticOrOrthodox,
    },
    fowCards: {
      count: fowCardCount,
      totalSwords: fowTotalSwords,
      totalShields: fowTotalShields,
    },
    fleetPositions,
  };
}

// Battle context captured by AerialBattleStrategy

export interface BattleContext {
  myStrength: number;
  enemyStrength: number;
  ratio: number;
  threshold: number;
  fowCardCount: number;
  targetID: string;
  decision: "attack" | "doNotAttack" | "evade" | "fight";
  /** Filled in after the battle resolves — leave undefined until then */
  outcome?: "won" | "lost" | "evaded";
}

// Decision entry enriched with game-state context

export interface EnrichedDecision extends DecisionLogEntry {
  snapshot: PlayerSnapshot;
  battleContext?: BattleContext;
}

// Per-player summary for the whole game

export interface PlayerGameSummary {
  playerID: string;
  personality: string;
  kaCard: string;
  legacyCard: string;
  alignment: string;
  weights: AIWeights;
  finalVP: number;
  finalRank: number;
}

// Diagnostic entry (replaces fs.appendFileSync to /tmp/selfplay_trace.log)
export interface DiagnosticEntry {
  type: "bounce" | "stall" | "nan" | "skip" | "transition" | "round_start";
  iteration: number;
  round: number;
  phase: string;
  playerID: string;
  details: string;
}

export interface MoveRecord {
  moveName: string;
  playerID: string;
  args: unknown[];
  round: number;
  turn: number;
  phase: string;
  timestamp: string;
}

// Complete game record

export interface GameRecord {
  gameId: string;
  timestamp: string;
  /** Snapshot of AI_CONFIG used for this game (for reproducibility) */
  configSnapshot: Record<string, unknown>;
  players: Record<string, PlayerGameSummary>;
  decisions: EnrichedDecision[];
  moves: MoveRecord[];
  roundSummaries: RoundSummaryEntry[];
  diagnostics: DiagnosticEntry[];
  result: {
    winner: string;
    winnerPersonality: string;
    scores: Record<string, number>;
    rounds: number;
    rankings: { playerID: string; personality: string; vp: number }[];
  } | null;
}

// GameRecorder class

export class GameRecorder {
  private record: GameRecord;

  constructor(gameId?: string) {
    this.record = {
      gameId: gameId ?? `game_${Date.now()}`,
      timestamp: new Date().toISOString(),
      configSnapshot: {},
      players: {},
      decisions: [],
      moves: [],
      roundSummaries: [],
      diagnostics: [],
      result: null,
    };
  }

  setConfig(config: Record<string, unknown>): void {
    this.record.configSnapshot = config;
  }

  addPlayer(playerID: string, summary: PlayerGameSummary): void {
    this.record.players[playerID] = summary;
  }

  addDecision(decision: EnrichedDecision): void {
    this.record.decisions.push(decision);
  }

  recordMove(
    moveName: string,
    playerID: string,
    args: unknown[],
    round: number,
    turn: number,
    phase: string
  ): void {
    this.record.moves.push({
      moveName,
      playerID,
      args,
      round,
      turn,
      phase,
      timestamp: new Date().toISOString(),
    });
  }

  addRoundSummary(summary: RoundSummaryEntry): void {
    this.record.roundSummaries.push(summary);
  }

  addDiagnostic(entry: DiagnosticEntry): void {
    this.record.diagnostics.push(entry);
  }

  setResult(result: GameRecord["result"]): void {
    this.record.result = result;
  }

  getRecord(): GameRecord {
    return this.record;
  }

  // Helper: get decisions for a specific player
  getPlayerDecisions(playerID: string): EnrichedDecision[] {
    return this.record.decisions.filter((d) => d.playerID === playerID);
  }

  // Helper: get move distribution for a player (or all players if omitted)
  getMoveDistribution(playerID?: string): Record<string, number> {
    const decisions = playerID
      ? this.getPlayerDecisions(playerID)
      : this.record.decisions;
    const dist: Record<string, number> = {};
    for (const d of decisions) {
      dist[d.chosenMove] = (dist[d.chosenMove] ?? 0) + 1;
    }
    return dist;
  }

  // Helper: get only decisions that have battle context attached
  getBattleDecisions(): EnrichedDecision[] {
    return this.record.decisions.filter((d) => d.battleContext != null);
  }

  toJSON(): string {
    return JSON.stringify(this.record, null, 2);
  }
}
