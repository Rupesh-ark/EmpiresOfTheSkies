/**
 * V2 Discovery Phase Evaluator
 *
 * Moves: discoverTile, pass
 * Each undiscovered tile adjacent to discovered territory is a candidate.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { personalityBonus } from "../common";

function evaluateDiscoverTile(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const reasons: string[] = [];
  let quality = V2_CONFIG.discovery.discoverBase;

  const player = G.playerInfo[playerID];
  const territories = G.mapState.buildings.flat().filter(
    b => b.player?.id === playerID && b.buildings
  ).length;

  // Early game: discovery is important for expansion
  if (territories === 0) {
    quality += V2_CONFIG.discovery.noTerritoryBonus;
    reasons.push("no territory yet");
  }

  // Personality — explorers and conquerors want to discover
  const pb = personalityBonus(personality, {
    legacyCards: ["the navigator", "the conqueror"],
    legacyBonus: V2_CONFIG.discovery.explorerBonus,
  });
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `discover tile. ${reasons.join(", ")}`,
  };
}

function evaluateDiscoveryPass(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  let quality = V2_CONFIG.discovery.passBase;
  const reasons: string[] = [];

  // Later in the game, passing discovery is more acceptable
  if (G.round >= 4) {
    quality += V2_CONFIG.discovery.lateGamePassBonus;
    reasons.push("late game");
  }

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `pass discovery. ${reasons.join(", ")}`,
  };
}

export function evaluateDiscovery(
  G: MyGameState,
  playerID: string,
  moves: AIMove[],
  personality: BotPersonality,
): { viable: MoveEval[]; filtered: MoveEval[] } {
  const viable: MoveEval[] = [];
  const filtered: MoveEval[] = [];

  for (const move of moves) {
    let result: MoveEval;
    if (move.move === "discoverTile") {
      result = evaluateDiscoverTile(G, playerID, move, personality);
    } else if (move.move === "pass") {
      result = evaluateDiscoveryPass(G, playerID, move, personality);
    } else {
      result = { move, viable: true, quality: 0.3, reason: "unknown discovery move" };
    }

    if (result.viable && result.quality >= V2_CONFIG.qualityThreshold) {
      viable.push(result);
    } else {
      filtered.push({ ...result, viable: false });
    }
  }

  return { viable, filtered };
}

export function pickDiscoveryMove(viable: MoveEval[]): MoveEval | null {
  if (viable.length === 0) return null;
  const idx = Math.floor(Math.random() * viable.length);
  return viable[idx];
}
