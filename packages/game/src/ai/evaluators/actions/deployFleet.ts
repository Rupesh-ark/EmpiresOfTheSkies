/**
 * V2 Evaluator: deployFleet
 *
 * Evaluates whether deploying a fleet to a destination is reasonable.
 * Cost: 1-3g based on distance. Also consumes skyships and troops from reserves.
 * This is a key economic move — fleets enable routes, conquest, and plunder.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { getBase } from "../archetypes";
import { goldPressure, goldPressureReason, personalityBonus, roundAwareness, tradeRouteChainValue } from "../common";
import { countActiveTradeRoutes, buildPlayerNetwork, tileKey, FAITHDOM_TILES, bfsReachable } from "../../../helpers/mapUtils";

const DEPLOY_PERSONALITY = {
  kaCards: ["elite_regiments", "sanctioned_piracy"],
  legacyCards: ["the conqueror", "the navigator", "the aviator", "the merchant"],
  kaBonus: 0.08,
  legacyBonus: 0.08,
};

/**
 * Check if deploying to this tile would help form or extend a trade route.
 * A trade route needs: outpost/colony → skyship chain → Faithdom.
 */
function hasTradeRoutePotential(G: MyGameState, playerID: string, dx: number, dy: number): boolean {
  const network = buildPlayerNetwork(G, playerID);
  network.add(tileKey(dx, dy));

  // Check if any existing outpost/colony becomes reachable to Faithdom
  for (let y = 0; y < G.mapState.buildings.length; y++) {
    for (let x = 0; x < G.mapState.buildings[y].length; x++) {
      const building = G.mapState.buildings[y][x];
      if (building.player?.id !== playerID || !building.buildings) continue;
      if (building.buildings !== "outpost" && building.buildings !== "colony") continue;

      const extendedNetwork = new Set(network);
      extendedNetwork.add(tileKey(x, y));
      const reachable = bfsReachable(FAITHDOM_TILES, extendedNetwork, G.mapState.currentTileArray);
      if (reachable.has(tileKey(x, y))) return true;
    }
  }

  // Also: if we claim this tile as outpost, would it connect to Faithdom?
  const reachable = bfsReachable(FAITHDOM_TILES, network, G.mapState.currentTileArray);
  return reachable.has(tileKey(dx, dy));
}

export function evaluateDeployFleet(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const dest = move.args[1] as [number, number];
  const skyshipCount = (move.args[2] as number) ?? 0;
  const regimentCount = (move.args[3] as number) ?? 0;
  const eliteCount = (move.args[5] as number) ?? 0;
  const gold = player.resources.gold;
  const routes = countActiveTradeRoutes(G, playerID);

  const estimatedCost = 1;
  const reasons: string[] = [];
  let quality = getBase(personality.baseQualities, "deployFleet");

  // No skyships = useless deploy
  if (skyshipCount === 0) {
    return { move, viable: false, quality: 0, reason: "no skyships in deploy" };
  }

  // Troop loadout
  const hasTroops = regimentCount + eliteCount > 0;
  const armySwords = regimentCount * 2 + eliteCount * 3 + skyshipCount;

  // Destination tile analysis
  if (dest) {
    const [dx, dy] = dest;
    const tile = G.mapState.currentTileArray[dy]?.[dx];
    const building = G.mapState.buildings[dy]?.[dx];
    const rivalsOnTile = (G.mapState.battleMap[dy]?.[dx] ?? []).filter(
      (id: string) => id !== playerID
    ).length;

    if (!tile) {
      return { move, viable: false, quality: 0, reason: "invalid tile" };
    }

    if (tile.type === "land") {
      if (!building?.player) {
        quality += V2_CONFIG.bonuses.unclaimedLand;
        reasons.push("unclaimed land");

        const canConquer = hasTroops && armySwords > (tile.sword ?? 0) * 1.4;

        if (hasTroops && rivalsOnTile === 0) {
          quality += V2_CONFIG.bonuses.soleOccupier;
          if (canConquer) {
            quality += V2_CONFIG.bonuses.canConquer;
            reasons.push("can conquer (sole + troops)");
          } else {
            reasons.push("sole occupier but weak army");
          }
        } else if (!hasTroops) {
          quality -= V2_CONFIG.bonuses.noTroopsPenalty * V2_CONFIG.penaltyScale;
          reasons.push("no troops (can't garrison)");
        }
      } else if (building.player.id === playerID) {
        quality += V2_CONFIG.bonuses.ownTerritory;
        reasons.push("reinforce own territory");
      } else {
        quality += V2_CONFIG.bonuses.rivalTerritory;
        reasons.push("rival territory");
      }
    } else if (tile.type === "legend") {
      quality += V2_CONFIG.bonuses.legendTile;
      reasons.push("legend tile (plunder)");
    } else {
      quality -= V2_CONFIG.tile.oceanPenalty * V2_CONFIG.penaltyScale;
      reasons.push("ocean/home tile");
    }

    // Loot value at current market prices
    if (tile.type === "land" && tile.loot) {
      const loot = tile.loot.outpost;
      const markers = G.mapState.goodsPriceMarkers;
      const lootGold =
        (loot.gold ?? 0) +
        (loot.mithril ?? 0) * markers.mithril +
        (loot.dragonScales ?? 0) * markers.dragonScales +
        (loot.krakenSkin ?? 0) * markers.krakenSkin +
        (loot.magicDust ?? 0) * markers.magicDust +
        (loot.stickyIchor ?? 0) * markers.stickyIchor +
        (loot.pipeweed ?? 0) * markers.pipeweed;
      const lootVP = loot.victoryPoints ?? 0;
      if (lootGold >= 4 || lootVP >= 1) {
        quality += 0.10;
        reasons.push(`rich loot (${lootGold}g ${lootVP}vp)`);
      } else if (lootGold >= 2) {
        quality += 0.05;
        reasons.push(`decent loot (${lootGold}g)`);
      }
    }

    // Rival crowding
    if (rivalsOnTile >= 2) {
      quality -= V2_CONFIG.tile.multiRivalPenalty * V2_CONFIG.penaltyScale;
      reasons.push(`${rivalsOnTile} rivals on tile`);
    } else if (rivalsOnTile === 1) {
      quality -= V2_CONFIG.tile.rivalOnTilePenalty * V2_CONFIG.penaltyScale;
      reasons.push("1 rival on tile");
    }

    // Trade route potential
    if (tile.type === "land" || tile.type === "legend") {
      if (hasTradeRoutePotential(G, playerID, dx, dy)) {
        quality += V2_CONFIG.bonuses.tradeRoutePotential;
        reasons.push("trade route potential");
      }
    }

    // Route chain value — does deploying here help complete a skyship chain?
    const chainValue = tradeRouteChainValue(G, playerID, dx, dy);
    if (chainValue.score > 0) {
      if (chainValue.score >= 0.8) {
        quality += V2_CONFIG.bonuses.routeChainComplete;
        reasons.push(chainValue.reason);
      } else if (chainValue.score >= 0.4) {
        quality += V2_CONFIG.bonuses.routeChainExtend;
        reasons.push(chainValue.reason);
      } else {
        quality += V2_CONFIG.bonuses.routeChainAdjacent;
        reasons.push(chainValue.reason);
      }
    }
  }

  // Skyship count vs route potential — need sky > 1 to leave trail
  if (skyshipCount <= 1 && routes === 0) {
    quality -= 0.08;
    reasons.push("sky=1 can't leave trail");
  } else if (skyshipCount >= 3) {
    quality += 0.05;
    reasons.push("enough skyships for trail");
  }

  if (routes === 0 && G.round >= 1) {
    quality += V2_CONFIG.bonuses.noRoutesUrgency;
    reasons.push("no routes yet");
  }

  // Gold pressure (from common)
  quality += goldPressure(gold, estimatedCost);
  const gpReason = goldPressureReason(gold, estimatedCost);
  if (gpReason) reasons.push(gpReason);

  // Round awareness (from common)
  const ra = roundAwareness(G.round, G.finalRound, "early");
  quality += ra.modifier;
  if (ra.reason) reasons.push(ra.reason);

  // Personality (from common)
  const pb = personalityBonus(personality, DEPLOY_PERSONALITY);
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  // Clamp and return
  quality = Math.max(0, Math.min(1, quality));

  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason: `dest [${dest?.[0]},${dest?.[1]}], sky=${skyshipCount} reg=${regimentCount}. ${reasons.join(", ")}`,
  };
}
