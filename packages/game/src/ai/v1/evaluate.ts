/** @deprecated v1 scoring system — kept for non-actions phases. See ../evaluators/ for v2. */
import type { MyGameState, PlayerInfo } from "../../types.js";
import type { AIWeights, AIMove } from "../types.js";
import { CARD_RESOLVERS } from "../../helpers/legacyCardDefinitions.js";
import { countActiveTradeRoutes, bfsWithDistance, tileKey, FAITHDOM_TILES } from "../../helpers/mapUtils.js";
import { HERESY_MAX, MAX_COUNSELLORS, MAP_WIDTH, MAP_HEIGHT, KINGDOM_LOCATION } from "../../data/gameData.js";
import { AI_CONFIG } from "./weightsConfig.js";
import { getRepublicInfluence } from "../../helpers/republicUtils.js";

// Internal helpers

function getAllPlayers(G: MyGameState): PlayerInfo[] {
  return Object.values(G.playerInfo);
}

function normalizeAgainstMax(myValue: number, allValues: number[]): number {
  const max = Math.max(...allValues);
  if (max <= 0) return 0;
  return Math.min(1, myValue / max);
}

function gameProgress(G: MyGameState): number {
  // round 1 → 0, finalRound → 1
  const totalRounds = Math.max(2, G.finalRound); // avoid division by zero
  return Math.min(1, (G.round - 1) / (totalRounds - 1));
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
      if (cell.fort.includes(playerID)) forts++;
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
        const hasFort = cell.fort.includes(playerID);
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

  // Use shared helper for republic influence
  const republics = getRepublicInfluence(G, playerID);
  let supportingRepublics = 0;
  if (republics.zeeland.supporting) supportingRepublics++;
  if (republics.venoa.supporting) supportingRepublics++;

  // Mercy is only relevant when trailing
  const allVPs = getAllPlayers(G).map((p) => p.resources.victoryPoints);
  const leaderVP = Math.max(...allVPs);
  const myVP = player.resources.victoryPoints;
  const vpGap = leaderVP - myVP;
  const mercyRelevance = Math.min(1, Math.max(0, vpGap / ra.mercyVPGapScale));

  return (supportingRepublics / 2) * mercyRelevance;
}

// Move value helper

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
      const w = weights[dim as keyof AIWeights];
      const m = mult as number;
      if (typeof w === "number" && !isNaN(w) && typeof m === "number" && !isNaN(m)) {
        value += w * m;
      }
    }
  }
  return isNaN(value) ? (entry.base as number ?? 0.1) : value;
}

// Main export

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
        const allVPs = getAllPlayers(G).map((p) => p.resources.victoryPoints ?? 0);
        const leaderVP = Math.max(...allVPs);
        const myVP = player.resources.victoryPoints ?? 0;
        const vpGap = (isNaN(leaderVP) ? 0 : leaderVP) - (isNaN(myVP) ? 0 : myVP);
        const scale = AI_CONFIG.moveValues.influenceMercyVPGapScale as number;
        const boost = AI_CONFIG.moveValues.influenceMercyBoostScale as number;
        const mercyBoost =
          Math.min(1, Math.max(0, vpGap) / (scale || 1)) * (boost || 0);
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

    case "deployFleet": {
      const base = computeMoveValue("deployFleet", weights);
      const dest = move.args[1] as [number, number];
      if (!dest) return base;
      const [dx, dy] = dest;
      const tile = G.mapState.currentTileArray[dy]?.[dx];
      const building = G.mapState.buildings[dy]?.[dx];
      if (!tile) return base;

      let tileBonus = 0;
      const rivalsOnTile = (G.mapState.battleMap[dy]?.[dx] ?? []).filter(
        (id: string) => id !== playerID
      ).length;

      if (tile.type === "land") {
        if (!building?.player) {
          // Unclaimed land → outpost/colony potential
          const fleetRegs = (move.args[3] as number) ?? 0;
          const fleetElites = (move.args[5] as number) ?? 0;
          const fleetSky = (move.args[2] as number) ?? 0;
          const armySwords = fleetRegs * 2 + fleetElites * 3 + fleetSky;
          const canConquer = armySwords > tile.sword * 1.4;

          const loot = canConquer ? tile.loot.colony : tile.loot.outpost;
          // P2: Goods saturation — value goods at current market price
          const markers = G.mapState.goodsPriceMarkers;
          const goodsGold =
            (loot.mithril ?? 0) * (markers.mithril ?? 1) +
            (loot.dragonScales ?? 0) * (markers.dragonScales ?? 1) +
            (loot.krakenSkin ?? 0) * (markers.krakenSkin ?? 1) +
            (loot.magicDust ?? 0) * (markers.magicDust ?? 1) +
            (loot.stickyIchor ?? 0) * (markers.stickyIchor ?? 1) +
            (loot.pipeweed ?? 0) * (markers.pipeweed ?? 1);
          const lootValue = (loot.gold ?? 0) + goodsGold + (loot.victoryPoints ?? 0) * 2;

          tileBonus = 0.2 * weights.territory + 0.1 * weights.economy + lootValue * 0.015;

          const hasTroops = fleetRegs + fleetElites > 0;
          if (hasTroops && rivalsOnTile === 0) {
            tileBonus += 0.3;
            if (canConquer) tileBonus += 0.1;
          } else if (hasTroops) {
            tileBonus += 0.1;
          } else {
            tileBonus *= 0.3;
          }

          if (!canConquer && tile.sword > 8) {
            tileBonus *= 0.7;
          }

          // P2: Race discovery heresy — new race = heresy advance for all
          const tileRace = tile.name.split(/(\d+)/)[0].toLowerCase();
          if (tileRace !== "ocean" && !G.mapState.discoveredRaces.includes(tileRace)) {
            if (player.hereticOrOrthodox === "heretic") {
              tileBonus += 0.03 * weights.religion; // heresy is good for us
            } else {
              tileBonus -= 0.02 * weights.religion; // heresy hurts us
            }
          }
        } else if (building.player.id !== playerID) {
          // Rival territory — conquest/piracy opportunity
          tileBonus = 0.15 * weights.military + 0.05 * weights.territory;
        } else {
          // Own territory — reinforce
          tileBonus = 0.05 * weights.threats;
        }
      } else if (tile.type === "legend") {
        const loot = tile.loot.outpost;
        const lootValue = (loot.gold ?? 0) + (loot.victoryPoints ?? 0) * 2;
        tileBonus = 0.1 * weights.economy + 0.05 * weights.territory + lootValue * 0.015;
      } else {
        // ocean/home — deploying here has minimal value
        tileBonus = -0.1;
      }

      // P0: Hop cost
      const discoveredNet = new Set<string>();
      for (let iy = 0; iy < MAP_HEIGHT; iy++)
        for (let ix = 0; ix < MAP_WIDTH; ix++)
          if (G.mapState.discoveredTiles[iy]?.[ix])
            discoveredNet.add(tileKey(ix, iy));
      const dists = bfsWithDistance([KINGDOM_LOCATION], discoveredNet, G.mapState.currentTileArray);
      const hopDist = dists.get(tileKey(dx, dy)) ?? 3;
      tileBonus -= hopDist * 0.03;

      // P1: Trade route hazard — path through Infidel Empire
      if (dists.has(tileKey(4, 1))) {
        // Check if destination is only reachable through infidel tile
        // Simple heuristic: if dest is south of row 1, likely passes through [4,1]
        if (dy >= 2 && dx >= 3 && dx <= 5) {
          tileBonus -= 0.04;
        }
      }

      if (rivalsOnTile > 0) {
        tileBonus -= rivalsOnTile * 0.25;
      }

      // P1: Strategic positioning — rival presence NEAR destination
      const rivalFleetsNearby = getAllPlayers(G).some((p) =>
        p.id !== playerID && p.fleetInfo.some((f) =>
          f.skyships > 0 &&
          Math.abs(f.location[0] - dx) <= 1 && Math.abs(f.location[1] - dy) <= 1
        )
      );
      if (rivalFleetsNearby) {
        tileBonus += 0.04 * weights.military;  // opportunity for military bots
        tileBonus -= 0.02 * weights.economy;   // risk for economy bots
      }

      return base + tileBonus;
    }

    case "moveFleet":
      return computeMoveValue("moveFleet", weights);

    case "garrisonTransfer":
      return computeMoveValue("garrisonTransfer", weights);

    case "transferBetweenFleets":
      return computeMoveValue("transferBetweenFleets", weights);

    case "transferOutpost":
      return computeMoveValue("transferOutpost", weights);

    case "declareSmugglerGood":
      return computeMoveValue("declareSmugglerGood", weights);

    case "checkAndPlaceFort":
      return computeMoveValue("checkAndPlaceFort", weights);

    case "retaliate":
      return computeMoveValue("retaliate", weights);

    case "commitDeferredBattleCard":
      return computeMoveValue("commitDeferredBattleCard", weights);

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

    case "punishDissenters":
      return computeMoveValue("punishDissenters", weights);

    case "drawCard":
    case "drawCardConquest":
      return computeMoveValue("drawBattleCard", weights);

    case "pickCard":
    case "pickCardConquest":
      return computeMoveValue("playBattleCard", weights);

    case "garrisonTroops":
      return computeMoveValue("garrisonTroops", weights);

    case "defendGroundAttack":
      return computeMoveValue("defendGround", weights);

    case "yieldToAttacker":
      return computeMoveValue("yieldGround", weights);

    case "commitRebellionTroops":
      return computeMoveValue("commitRebellionTroops", weights);

    case "contributeToRebellion":
      return computeMoveValue("contributeToRebellion", weights);

    case "contributeToGrandArmy":
      return computeMoveValue("contributeToGrandArmy", weights);

    case "nominateCaptainGeneral":
      return computeMoveValue("nominateCaptainGeneral", weights);

    case "offerBuyoffGold":
      return computeMoveValue("offerBuyoffGold", weights);

    case "immediateElectionVote":
      return computeMoveValue("immediateElectionVote", weights);

    case "relocateDefeatedFleet":
      return computeMoveValue("relocateDefeatedFleet", weights);

    case "resolveEventChoice":
      return computeMoveValue("resolveEventChoice", weights);

    case "respondToInfidelFleet":
      return computeMoveValue("respondToInfidelFleet", weights);

    case "discardFoWCard":
      return computeMoveValue("discardFoWCard", weights);

    case "pass":
    case "confirmAction":
      return computeMoveValue("pass", weights);

    default:
      return computeMoveValue("defaultMove", weights);
  }
}
