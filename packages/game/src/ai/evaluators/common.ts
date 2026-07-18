/**
 * Common evaluation utilities shared across all move evaluators.
 *
 * Gold pressure, personality bonuses, round awareness, and diminishing returns
 * are concerns every evaluator has — defined once here.
 * All thresholds read from V2_CONFIG so they're tunable in one place.
 */
import type { BotPersonality } from "./types.js";
import { V2_CONFIG } from "./config.js";
import { buildPlayerNetwork, bfsReachable, FAITHDOM_TILES, tileKey, getPassableNeighbors } from "../../helpers/mapUtils.js";
import type { MyGameState } from "../../types.js";

// Gold Pressure

/**
 * Returns a penalty (0 to -max) based on what gold will be after spending.
 * Thresholds are configurable via V2_CONFIG.goldPressure.levels.
 */
export function goldPressure(currentGold: number, cost: number): number {
  if (cost === 0) return 0;
  const goldAfter = currentGold - cost;
  for (const level of V2_CONFIG.goldPressure.levels) {
    if (goldAfter < level.below) return -level.penalty * V2_CONFIG.penaltyScale;
  }
  return 0;
}

/**
 * Short description of gold state after a purchase.
 */
export function goldPressureReason(currentGold: number, cost: number): string | null {
  if (cost === 0) return null;
  const goldAfter = currentGold - cost;
  if (goldAfter < V2_CONFIG.goldPressure.levels[0].below) return "devastating debt";
  if (goldAfter < V2_CONFIG.goldPressure.levels[1].below) return "painful debt";
  if (goldAfter < V2_CONFIG.goldPressure.levels[2].below) return "goes negative";
  if (goldAfter < V2_CONFIG.goldPressure.levels[3].below) return "tight budget";
  return null;
}

// Personality Bonus

interface PersonalityMatch {
  kaCards?: string[];       // KA cards that benefit from this move
  legacyCards?: string[];   // Legacy cards that benefit from this move
  alignments?: string[];    // Alignments that benefit
  kaBonus?: number;         // bonus per matching KA (default 0.12)
  legacyBonus?: number;     // bonus per matching legacy (default 0.08)
  alignmentBonus?: number;  // bonus per matching alignment (default 0.03)
}

/**
 * Returns a personality bonus based on card matches.
 * Also returns reasons for analytics.
 */
export function personalityBonus(
  personality: BotPersonality,
  match: PersonalityMatch,
): { bonus: number; reasons: string[] } {
  let bonus = 0;
  const reasons: string[] = [];

  const kaB = match.kaBonus ?? V2_CONFIG.personality.kaBonus;
  const legB = match.legacyBonus ?? V2_CONFIG.personality.legacyBonus;
  const alB = match.alignmentBonus ?? V2_CONFIG.personality.alignmentBonus;

  if (match.kaCards?.includes(personality.kaCard)) {
    bonus += kaB;
    reasons.push(`${personality.kaCard} KA`);
  }
  if (match.legacyCards?.includes(personality.legacyCard)) {
    bonus += legB;
    reasons.push(`${personality.legacyCard} legacy`);
  }
  if (match.alignments?.includes(personality.alignment)) {
    bonus += alB;
  }

  return { bonus, reasons };
}

// Round Awareness

/**
 * Returns a modifier based on whether this type of move makes sense now.
 *
 * @param timing When this move is most useful:
 *   "early" = infrastructure (penalized late)
 *   "mid" = engine building (penalized very early/late)
 *   "late" = VP scoring (penalized early)
 *   "any" = always relevant
 */
export function roundAwareness(
  round: number,
  finalRound: number,
  timing: "early" | "mid" | "late" | "any",
): { modifier: number; reason: string | null } {
  if (timing === "any") return { modifier: 0, reason: null };

  if (timing === "early") {
    if (round >= finalRound) return { modifier: -V2_CONFIG.round.tooLatePenalty * V2_CONFIG.penaltyScale, reason: "too late for this" };
    if (round >= 4) return { modifier: -V2_CONFIG.round.mildPenalty * V2_CONFIG.penaltyScale, reason: "late for this" };
    return { modifier: 0, reason: null };
  }

  if (timing === "mid") {
    if (round <= 1) return { modifier: -V2_CONFIG.round.mildPenalty * V2_CONFIG.penaltyScale, reason: "too early" };
    if (round >= finalRound) return { modifier: -V2_CONFIG.round.mildPenalty * V2_CONFIG.penaltyScale * 0.5, reason: "late" };
    return { modifier: 0, reason: null };
  }

  if (timing === "late") {
    if (round <= 2) return { modifier: -V2_CONFIG.round.tooEarlyPenalty * V2_CONFIG.penaltyScale, reason: "too early for this" };
    if (round >= finalRound) return { modifier: V2_CONFIG.round.finalRoundBonus, reason: "final VP push" };
    return { modifier: 0, reason: null };
  }

  return { modifier: 0, reason: null };
}

// Heresy Pressure

/**
 * Heresy pressure — how well does the player's current heresy position
 * align with their legacy card colour?
 *
 * Returns a modifier:
 *   positive = well-aligned (no pressure to change)
 *   negative = misaligned (should consider conversion or heresy-shifting moves)
 *   zero = neutral or unknown
 *
 * purple legacy = scores best as orthodox (low heresy)
 * orange legacy = scores best as heretic (high heresy)
 */
export function heresyPressure(
  alignment: string,
  heresyPos: number,
  legacyCardColour: string,
): { modifier: number; reason: string } {
  if (legacyCardColour === "none") return { modifier: 0, reason: "" };

  // Legacy card alignment: purple = orthodox scoring, orange = heretic scoring
  const cardWantsOrthodox = legacyCardColour === "purple";
  const isOrthodox = alignment === "orthodox";
  const aligned = cardWantsOrthodox === isOrthodox;

  if (aligned) {
    // Good — alignment matches card. Small bonus.
    return { modifier: V2_CONFIG.heresy.alignedBonus, reason: "aligned with legacy card" };
  }

  // Misaligned — legacy card will score half VP at end.
  if (isOrthodox && !cardWantsOrthodox) {
    // Orthodox player with orange (heretic) card — misaligned
    const severity =
      heresyPos >= 7 ? V2_CONFIG.heresy.severeMisalign :
      heresyPos >= 4 ? V2_CONFIG.heresy.moderateMisalign :
      V2_CONFIG.heresy.mildMisalign;
    return { modifier: -severity, reason: `orthodox with heretic legacy card (pos ${heresyPos})` };
  }

  if (!isOrthodox && cardWantsOrthodox) {
    // Heretic player with purple (orthodox) card — misaligned
    const severity =
      heresyPos <= 5 ? V2_CONFIG.heresy.severeMisalign :
      heresyPos <= 10 ? V2_CONFIG.heresy.moderateMisalign :
      V2_CONFIG.heresy.mildMisalign;
    return { modifier: -severity, reason: `heretic with orthodox legacy card (pos ${heresyPos})` };
  }

  return { modifier: 0, reason: "" };
}

// Outpost/Colony Count

/** Count outposts + colonies owned by a player on the map. */
export function countOutposts(G: MyGameState, playerID: string): number {
  let count = 0;
  for (const row of G.mapState.buildings) {
    for (const cell of row) {
      if (cell.player?.id === playerID && (cell.buildings === "outpost" || cell.buildings === "colony")) {
        count++;
      }
    }
  }
  return count;
}

// Trade Route Chain Value

/**
 * Check if placing skyships at (x, y) would help complete or extend a trade route.
 * Returns a score 0-1 indicating how valuable this position is for route completion.
 *
 * High score if:
 * - This tile bridges an existing gap between outpost and Faithdom (completes a route)
 * - This tile extends the chain toward an unconnected settlement
 * - This tile is one hop from the existing network edge
 *
 * Low/zero score if:
 * - Player has no outposts (nothing to connect)
 * - Tile is far from any useful path
 * - Route already exists through other tiles
 */
export function tradeRouteChainValue(
  G: MyGameState,
  playerID: string,
  x: number,
  y: number,
): { score: number; reason: string } {
  // Find all player's outposts/colonies
  const settlements: [number, number][] = [];
  for (let sy = 0; sy < G.mapState.buildings.length; sy++) {
    for (let sx = 0; sx < G.mapState.buildings[sy].length; sx++) {
      const b = G.mapState.buildings[sy][sx];
      if (b.player?.id === playerID && (b.buildings === "outpost" || b.buildings === "colony")) {
        settlements.push([sx, sy]);
      }
    }
  }

  if (settlements.length === 0) {
    // No outposts — check if this tile would form a route if claimed
    const network = buildPlayerNetwork(G, playerID);
    network.add(tileKey(x, y));
    const reachable = bfsReachable(FAITHDOM_TILES, network, G.mapState.currentTileArray);
    if (reachable.has(tileKey(x, y))) {
      return { score: 0.6, reason: "would create connected settlement" };
    }
    return { score: 0, reason: "" };
  }

  // Current skyship network (includes Faithdom tiles)
  const currentNetwork = buildPlayerNetwork(G, playerID);

  // Reachable from Faithdom through current network (without this tile)
  const currentReachable = bfsReachable(FAITHDOM_TILES, currentNetwork, G.mapState.currentTileArray);

  // Expanded network with this tile added
  const expandedNetwork = new Set(currentNetwork);
  expandedNetwork.add(tileKey(x, y));
  const expandedReachable = bfsReachable(FAITHDOM_TILES, expandedNetwork, G.mapState.currentTileArray);

  // Count settlements that become newly connected by adding this tile
  let newConnections = 0;
  let alreadyConnected = 0;
  for (const [sx, sy] of settlements) {
    const key = tileKey(sx, sy);
    // A settlement is "connected" if it or an adjacent tile is reachable from Faithdom
    const wasConnected =
      currentReachable.has(key) ||
      getPassableNeighbors(sx, sy, G.mapState.currentTileArray).some(
        ([nx, ny]) => currentReachable.has(tileKey(nx, ny))
      );
    const nowConnected =
      expandedReachable.has(key) ||
      getPassableNeighbors(sx, sy, G.mapState.currentTileArray).some(
        ([nx, ny]) => expandedReachable.has(tileKey(nx, ny))
      );

    if (nowConnected && !wasConnected) newConnections++;
    if (wasConnected) alreadyConnected++;
  }

  if (newConnections > 0) {
    const score = Math.min(1, 0.8 + (newConnections - 1) * 0.1);
    return {
      score,
      reason: `completes ${newConnections} trade route(s)`,
    };
  }

  // Check if this tile extends the chain toward unconnected settlements
  if (settlements.length > alreadyConnected) {
    if (expandedReachable.has(tileKey(x, y))) {
      return { score: 0.4, reason: "extends chain toward unconnected settlement" };
    }

    // Check if this tile is adjacent to the current Faithdom-reachable network edge
    const neighbors = getPassableNeighbors(x, y, G.mapState.currentTileArray);
    const adjacentToNetwork = neighbors.some(([nx, ny]) => currentReachable.has(tileKey(nx, ny)));
    if (adjacentToNetwork) {
      return { score: 0.3, reason: "extends skyship chain (adjacent to network)" };
    }
  }

  return { score: 0, reason: "" };
}

// Diminishing Returns

/**
 * Returns a penalty based on how many of something you already have.
 * Reads defaults from V2_CONFIG.diminishing, overridable per call.
 */
export function diminishingReturns(
  owned: number,
  perUnit = V2_CONFIG.diminishing.perUnit,
  hardCap = V2_CONFIG.diminishing.hardCap,
): { penalty: number; reason: string | null } {
  if (owned >= hardCap) {
    return {
      penalty: V2_CONFIG.diminishing.hardCapPenalty * V2_CONFIG.penaltyScale,
      reason: `already have ${owned} (capped)`,
    };
  }
  if (owned === 0) return { penalty: 0, reason: null };
  const penalty = owned * perUnit * V2_CONFIG.penaltyScale;
  return {
    penalty,
    reason: owned >= 3 ? `have ${owned} already` : null,
  };
}
