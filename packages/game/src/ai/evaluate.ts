import type { MyGameState, PlayerInfo } from "../types";
import type { AIWeights, AIMove } from "./types";
import { CARD_RESOLVERS } from "../helpers/legacyCardDefinitions";
import { countActiveTradeRoutes } from "../helpers/mapUtils";
import { HERESY_MAX, FINAL_ROUND, MAX_COUNSELLORS } from "../data/gameData";
import { AI_CONFIG } from "./weightsConfig";

// ── Internal helpers ──────────────────────────────────────────────────────────

function getAllPlayers(G: MyGameState): PlayerInfo[] {
  return Object.values(G.playerInfo);
}

function normalizeAgainstMax(myValue: number, allValues: number[]): number {
  const max = Math.max(...allValues);
  if (max <= 0) return 0;
  return Math.min(1, myValue / max);
}

function gameProgress(G: MyGameState): number {
  // round 1 → 0, round 4 → 1
  return Math.min(1, (G.round - 1) / (FINAL_ROUND - 1));
}

function countPlayerBuildings(
  G: MyGameState,
  playerID: string
): { outposts: number; colonies: number; forts: number } {
  let outposts = 0,
    colonies = 0,
    forts = 0;
  G.mapState.buildings.forEach((row) =>
    row.forEach((cell) => {
      if (cell.player?.id !== playerID) return;
      if (cell.buildings === "outpost") outposts++;
      if (cell.buildings === "colony") colonies++;
      if (cell.fort) forts++;
    })
  );
  return { outposts, colonies, forts };
}

function totalMilitaryStrength(player: PlayerInfo): number {
  const m = AI_CONFIG.eval.military;
  let strength = player.resources.regiments + player.resources.levies * m.levyWeight;
  strength += player.resources.eliteRegiments * m.eliteWeight;
  strength += player.resources.skyships * m.skyshipWeight;
  for (const fleet of player.fleetInfo) {
    strength += fleet.regiments + fleet.levies * m.levyWeight;
    strength += fleet.eliteRegiments * m.eliteWeight;
    strength += fleet.skyships * m.skyshipWeight;
  }
  return strength;
}

// ── Dimensions ────────────────────────────────────────────────────────────────

function normalizedTerritory(G: MyGameState, playerID: string): number {
  const t = AI_CONFIG.eval.territory;
  const players = getAllPlayers(G);
  const scores = players.map((p) => {
    const b = countPlayerBuildings(G, p.id);
    const routes = countActiveTradeRoutes(G, p.id);
    return b.outposts + b.colonies * t.colonyWeight + b.forts * t.fortWeight + routes * t.routeWeight;
  });
  const myBuildings = countPlayerBuildings(G, playerID);
  const myRoutes = countActiveTradeRoutes(G, playerID);
  const myScore =
    myBuildings.outposts +
    myBuildings.colonies * t.colonyWeight +
    myBuildings.forts * t.fortWeight +
    myRoutes * t.routeWeight;
  return normalizeAgainstMax(myScore, scores);
}

function normalizedEconomy(G: MyGameState, playerID: string): number {
  const e = AI_CONFIG.eval.economy;
  const players = getAllPlayers(G);
  const scores = players.map((p) => {
    const routes = countActiveTradeRoutes(G, p.id);
    const effectiveFactories = Math.min(p.factories, routes);
    const unengagedPenalty = Math.max(0, p.factories - routes) * e.unengagedPenalty;
    return p.resources.gold + effectiveFactories * e.factoryIncomeValue - unengagedPenalty;
  });
  const player = G.playerInfo[playerID];
  const myRoutes = countActiveTradeRoutes(G, playerID);
  const myEffective = Math.min(player.factories, myRoutes);
  const myUnengaged = Math.max(0, player.factories - myRoutes) * e.unengagedPenalty;
  const myScore = player.resources.gold + myEffective * e.factoryIncomeValue - myUnengaged;
  return normalizeAgainstMax(
    Math.max(0, myScore),
    scores.map((s) => Math.max(0, s))
  );
}

function normalizedMilitary(G: MyGameState, playerID: string): number {
  const players = getAllPlayers(G);
  const strengths = players.map((p) => totalMilitaryStrength(p));
  const myStrength = totalMilitaryStrength(G.playerInfo[playerID]);
  return normalizeAgainstMax(myStrength, strengths);
}

function normalizedReligion(G: MyGameState, playerID: string): number {
  const r = AI_CONFIG.eval.religion;
  const player = G.playerInfo[playerID];
  let score = 0;

  // Heresy alignment: normalize heresyTracker to 0-1 in the player's favoured direction
  const heresy = player.heresyTracker; // range: HERESY_MIN (-9) to HERESY_MAX (9)
  if (player.hereticOrOrthodox === "heretic") {
    score += (heresy + HERESY_MAX) / (2 * HERESY_MAX);
  } else {
    score += (HERESY_MAX - heresy) / (2 * HERESY_MAX);
  }

  // Archprelate bonus (diminished by consecutive wins — Archprelate Fatigue)
  if (player.isArchprelate) {
    const fatigueMultiplier = 1 / (1 + G.consecutiveArchprelateWins * r.fatigueFactor);
    score += r.archprelateBonus * fatigueMultiplier;
  }

  // Religious buildings
  if (player.hereticOrOrthodox === "orthodox") {
    score += player.cathedrals * r.buildingBonus;
  } else {
    score += player.palaces * r.buildingBonus;
  }

  // Free dissenters penalty
  score -= player.freeDissenters * r.dissenterPenalty;

  return Math.max(0, Math.min(1, score));
}

function normalizedLegacy(G: MyGameState, playerID: string): number {
  const l = AI_CONFIG.eval.legacy;
  const player = G.playerInfo[playerID];
  const card = player.resources.legacyCard;
  if (!card) return 0;

  // Call the actual game resolver to get raw VP
  const rawVP = CARD_RESOLVERS[card.name](player, G);

  // Apply alignment penalty (same as resolveCardWithAlignmentPenalty)
  const wrongAlignment =
    (player.hereticOrOrthodox === "orthodox" && card.colour === "orange") ||
    (player.hereticOrOrthodox === "heretic" && card.colour === "purple");
  const effectiveVP = wrongAlignment ? Math.ceil(rawVP / 2) : rawVP;

  // Normalize against practical max (~20 VP)
  const normalizedVP = Math.min(1, effectiveVP / l.maxReasonableVP);

  // Weight by game progress: early game is speculative, late game is locked in
  const progress = gameProgress(G);
  return normalizedVP * (l.earlyGameWeight + l.lateGameWeight * progress);
}

function normalizedPositioning(G: MyGameState, playerID: string): number {
  const pos = AI_CONFIG.eval.positioning;
  const player = G.playerInfo[playerID];
  const players = getAllPlayers(G);

  const scores = players.map((p) => {
    const deployedFleets = p.fleetInfo.filter(
      (f) => f.skyships > 0 && (f.location[0] !== 4 || f.location[1] !== 0)
    ).length;
    const counsellorScore = p.resources.counsellors / MAX_COUNSELLORS;
    const fowScore = Math.min(1, p.resources.fortuneCards.length / pos.fowMax);
    return deployedFleets * pos.fleetWeight + counsellorScore * pos.counsellorWeight + fowScore * pos.fowWeight;
  });

  // Find this player's score by matching ID rather than assuming array order
  const myScore =
    scores[players.findIndex((p) => p.id === playerID)] ?? 0;

  // Suppress unused-variable warning — player is used indirectly via fleetInfo above
  void player;

  return normalizeAgainstMax(myScore, scores);
}

function normalizedThreats(G: MyGameState, playerID: string): number {
  const th = AI_CONFIG.eval.threats;
  const player = G.playerInfo[playerID];
  let threatScore = 0;

  const buildings = countPlayerBuildings(G, playerID);
  const totalTerritories = buildings.outposts + buildings.colonies;

  if (totalTerritories > 0) {
    let unprotected = 0;
    G.mapState.buildings.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.player?.id !== playerID) return;
        if (cell.buildings !== "outpost" && cell.buildings !== "colony") return;
        const hasGarrison =
          (cell.garrisonedRegiments ?? 0) +
            (cell.garrisonedLevies ?? 0) +
            (cell.garrisonedEliteRegiments ?? 0) >
          0;
        const hasFort = cell.fort;
        const hasFleet = player.fleetInfo.some(
          (f) => f.skyships > 0 && f.location[0] === x && f.location[1] === y
        );
        if (!hasGarrison && !hasFort && !hasFleet) unprotected++;
      })
    );
    threatScore += unprotected / totalTerritories;
  }

  // Free dissenters threat
  threatScore += player.freeDissenters * th.dissenterThreat;

  // Piracy exposure — enemy fleets on player-controlled tiles
  let piracyExposure = 0;
  G.mapState.buildings.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.player?.id !== playerID) return;
      if (cell.buildings !== "outpost" && cell.buildings !== "colony") return;
      const enemyPresent = G.mapState.battleMap[y]?.[x]?.some(
        (id: string) => id !== playerID
      );
      if (enemyPresent) piracyExposure++;
    })
  );
  if (totalTerritories > 0) {
    threatScore += (piracyExposure / totalTerritories) * th.piracyExposureWeight;
  }

  // Invert: high threat = low score
  return Math.max(0, Math.min(1, 1 - threatScore));
}

function normalizedRepublicAccess(G: MyGameState, playerID: string): number {
  const ra = AI_CONFIG.eval.republicAccess;
  const player = G.playerInfo[playerID];
  const playerAlignment = player.hereticOrOrthodox;

  let supportingRepublics = 0;

  // Venoa — slot 5 in influencePrelates
  const venoaHeretic = G.eventState.nprHeretic.includes("Venoa");
  const venoaAlignment = venoaHeretic ? "heretic" : "orthodox";
  const venoaInfluenced = G.boardState.influencePrelates[5] === playerID;
  if (venoaAlignment === playerAlignment || venoaInfluenced) supportingRepublics++;

  // Zeeland — slot 4 in influencePrelates
  const zeelandHeretic = G.eventState.nprHeretic.includes("Zeeland");
  const zeelandAlignment = zeelandHeretic ? "heretic" : "orthodox";
  const zeelandInfluenced = G.boardState.influencePrelates[4] === playerID;
  if (zeelandAlignment === playerAlignment || zeelandInfluenced) supportingRepublics++;

  // Mercy is only relevant when trailing
  const allVPs = getAllPlayers(G).map((p) => p.resources.victoryPoints);
  const leaderVP = Math.max(...allVPs);
  const myVP = player.resources.victoryPoints;
  const vpGap = leaderVP - myVP;
  const mercyRelevance = Math.min(1, Math.max(0, vpGap / ra.mercyVPGapScale));

  return (supportingRepublics / 2) * mercyRelevance;
}

// ── Move value helper ─────────────────────────────────────────────────────────

function computeMoveValue(
  configKey: string,
  weights: AIWeights
): number {
  const entry = AI_CONFIG.moveValues[configKey];
  if (typeof entry === "number") return entry;
  if (!entry) return 0;
  let value = (entry.base as number | undefined) ?? 0;
  for (const [dim, mult] of Object.entries(entry)) {
    if (dim === "base") continue;
    if (dim in weights) {
      value += weights[dim as keyof AIWeights] * (mult as number);
    }
  }
  return value;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Evaluate the game state for a player, returning a score in [0, 1].
 * Score = Σ(weight_i × normalizedDimension_i).
 */
export function evaluateState(
  G: MyGameState,
  playerID: string,
  weights: AIWeights
): number {
  const t = normalizedTerritory(G, playerID);
  const e = normalizedEconomy(G, playerID);
  const m = normalizedMilitary(G, playerID);
  const r = normalizedReligion(G, playerID);
  const l = normalizedLegacy(G, playerID);
  const p = normalizedPositioning(G, playerID);
  const th = normalizedThreats(G, playerID);
  const ra = normalizedRepublicAccess(G, playerID);

  return (
    weights.territory * t +
    weights.economy * e +
    weights.military * m +
    weights.religion * r +
    weights.legacy * l +
    weights.positioning * p +
    weights.threats * th +
    weights.republicAccess * ra
  );
}

/**
 * Fast heuristic estimate of how much a move improves the player's position.
 * Does NOT run full evaluateState — returns a relative value where higher = better.
 */
export function estimateMoveValue(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  weights: AIWeights
): number {
  const player = G.playerInfo[playerID];

  switch (move.move) {
    case "recruitCounsellors":
      return computeMoveValue("recruitCounsellors", weights);

    case "recruitRegiments":
      return computeMoveValue("recruitRegiments", weights);

    case "purchaseSkyships":
      return computeMoveValue("purchaseSkyships", weights);

    case "foundBuildings": {
      const slotIndex = move.args[0] as number;
      if (slotIndex === 0) {
        return player.hereticOrOrthodox === "orthodox"
          ? computeMoveValue("cathedralOrthodox", weights)
          : computeMoveValue("cathedralHeretic", weights);
      }
      if (slotIndex === 1) {
        return player.hereticOrOrthodox === "heretic"
          ? computeMoveValue("palaceHeretic", weights)
          : computeMoveValue("palaceOrthodox", weights);
      }
      if (slotIndex === 2) return computeMoveValue("shipyard", weights);
      if (slotIndex === 3) return computeMoveValue("fort", weights);
      return computeMoveValue("foundBuildingsDefault", weights);
    }

    case "foundFactory": {
      const routes = countActiveTradeRoutes(G, playerID);
      const currentFactories = player.factories;
      if (currentFactories >= routes) {
        return computeMoveValue("foundFactoryUnengaged", weights);
      }
      return computeMoveValue("foundFactoryEngaged", weights);
    }

    case "influencePrelates": {
      const prelateIndex = move.args[0] as number;
      if (prelateIndex === 4 || prelateIndex === 5) {
        const allVPs = getAllPlayers(G).map((p) => p.resources.victoryPoints);
        const leaderVP = Math.max(...allVPs);
        const vpGap = leaderVP - player.resources.victoryPoints;
        const mercyBoost =
          Math.min(1, vpGap / (AI_CONFIG.moveValues.influenceMercyVPGapScale as number)) *
          (AI_CONFIG.moveValues.influenceMercyBoostScale as number);
        return computeMoveValue("influencePrelatesRepublic", weights) + mercyBoost;
      }
      return computeMoveValue("influencePrelatesRegular", weights);
    }

    case "sendAgitators": {
      const targetID = move.args[0] as string;
      const targetVP = G.playerInfo[targetID]?.resources.victoryPoints ?? 0;
      const allVPs = getAllPlayers(G).map((p) => p.resources.victoryPoints);
      const leaderVP = Math.max(...allVPs);
      const isTargetLeader = targetVP === leaderVP;
      const base = computeMoveValue("sendAgitatorsBase", weights);
      return isTargetLeader ? base + (AI_CONFIG.moveValues.sendAgitatorsLeaderBonus as number) : base;
    }

    case "deployFleet":
      return computeMoveValue("deployFleet", weights);

    case "moveFleet":
      return computeMoveValue("moveFleet", weights);

    case "garrisonTransfer":
      return computeMoveValue("garrisonTransfer", weights);

    case "trainTroops":
      return computeMoveValue("trainTroops", weights);

    case "drawFoWCards":
      return computeMoveValue("drawFoWCards", weights);

    case "buildSkyships":
      return computeMoveValue("buildSkyships", weights);

    case "conscriptLevies":
      return computeMoveValue("conscriptLevies", weights);

    case "increaseHeresy":
      return player.hereticOrOrthodox === "heretic"
        ? computeMoveValue("increaseHeresyAligned", weights)
        : computeMoveValue("increaseHeresyMisaligned", weights);

    case "increaseOrthodoxy":
      return player.hereticOrOrthodox === "orthodox"
        ? computeMoveValue("increaseHeresyAligned", weights)
        : computeMoveValue("increaseHeresyMisaligned", weights);

    case "convertMonarch":
      return computeMoveValue("convertMonarch", weights);

    case "alterPlayerOrder":
      return computeMoveValue("alterPlayerOrder", weights);

    case "sellSkyships":
    case "sellBuilding":
      return computeMoveValue("sell", weights);

    case "discoverTile":
      return computeMoveValue("discoverTile", weights);

    case "attackOtherPlayersFleet":
    case "attackPlayersBuilding":
      return computeMoveValue("attack", weights);

    case "doNotAttack":
    case "doNotGroundAttack":
    case "doNotPlunder":
    case "doNothing":
      return computeMoveValue("passive", weights);

    case "evadeAttackingFleet":
      return computeMoveValue("evade", weights);

    case "plunder":
      return computeMoveValue("plunder", weights);

    case "coloniseLand":
      return computeMoveValue("coloniseLand", weights);

    case "constructOutpost":
      return computeMoveValue("constructOutpost", weights);

    case "vote": {
      const targetID = move.args[0] as string;
      if (targetID === playerID) return computeMoveValue("voteSelf", weights);
      return computeMoveValue("voteOther", weights);
    }

    case "retrieveFleets":
      return computeMoveValue("retrieveFleets", weights);

    case "chooseEventCard":
      return computeMoveValue("chooseEventCard", weights);

    case "pickKingdomAdvantageCard":
    case "pickLegacyCard":
      return computeMoveValue("pickCard", weights);

    case "pass":
    case "confirmAction":
      return computeMoveValue("pass", weights);

    default:
      return computeMoveValue("defaultMove", weights);
  }
}
