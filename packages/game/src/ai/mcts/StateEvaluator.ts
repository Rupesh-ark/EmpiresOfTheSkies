/**
 * Evaluate a game state from a player's perspective.
 * Used at leaf nodes of MCTS when rollout is truncated.
 *
 * VP is the primary signal. Buildings, territory, and resources
 * are secondary — they represent future VP potential.
 * Weights are configurable for tournament testing.
 */
import type { MyGameState } from "../../types.js";
import { getTradeRoutes } from "./RouteCache.js";
import type { EvalWeights } from "./tournament.js";

// CMA-ES tuned defaults (final iterative pass, 2026-03-30)
const DEFAULT_EVAL_WEIGHTS: EvalWeights = {
  name: "cma-es-tuned",
  vp: 1.157328,
  colony: 0.664778,
  outpost: 0.333631,
  route: 0.614023,
  engagedFactory: 0.120727,
  cathedral: 0.313722,
  palace: 0.412913,
  shipyard: 0.25487,
  fort: 0.014142,
  skyship: 0.133849,
  regiment: 0.059093,
  eliteRegiment: 0.090228,
  levy: 0.012073,
  gold: 0.217609,
  counsellor: 0.499654,
  militaryStrength: 0.193246,
  heresyVP: 0.427743,
  debtPenalty: 0.155256,
  dissenterPenalty: 0.21465,
  unconnectedPenalty: 0.129581,
};

// Active weights — can be swapped for tournaments
let activeWeights: EvalWeights | null = null;

export function setEvalWeights(weights: EvalWeights | null): void {
  activeWeights = weights;
}

/** Fast cached trade route count for one player */
function countRoutesCached(G: MyGameState, playerID: string): number {
  const allRoutes = getTradeRoutes(G, Object.keys(G.playerInfo));
  return allRoutes[playerID] ?? 0;
}

export function evaluatePosition(G: MyGameState, playerID: string): number {
  const player = G.playerInfo[playerID];
  const routes = countRoutesCached(G, playerID);

  let outposts = 0;
  let colonies = 0;
  let forts = 0;
  G.mapState.buildings.forEach(row =>
    row.forEach(cell => {
      if (cell.player?.id !== playerID) return;
      if (cell.buildings === "outpost") outposts++;
      if (cell.buildings === "colony") colonies++;
      if (cell.fort.includes(playerID)) forts++;
    })
  );

  const engagedFactories = Math.min(player.factories, routes);
  const w = activeWeights ?? DEFAULT_EVAL_WEIGHTS;

  let score = player.resources.victoryPoints * w.vp;

  score += colonies * w.colony;
  score += outposts * w.outpost;
  score += routes * w.route;
  score += engagedFactories * w.engagedFactory;

  // Unconnected penalty
  const totalSettlements = outposts + colonies;
  const unconnected = Math.max(0, totalSettlements - routes);
  if (unconnected > 0 && totalSettlements > 0) {
    score -= unconnected * w.unconnectedPenalty;
  }

  score += player.cathedrals * w.cathedral;
  score += player.palaces * w.palace;
  score += player.shipyards * w.shipyard;
  score += forts * w.fort;

  score += player.resources.skyships * w.skyship;
  score += player.resources.regiments * w.regiment;
  score += (player.resources.eliteRegiments ?? 0) * w.eliteRegiment;
  score += (player.resources.levies ?? 0) * w.levy;
  score += Math.max(0, player.resources.gold) * w.gold;
  score += player.resources.counsellors * w.counsellor;

  const militaryStrength =
    player.resources.regiments * 2 +
    (player.resources.eliteRegiments ?? 0) * 3 +
    (player.resources.levies ?? 0) * 1 +
    player.resources.skyships * 1;
  score += militaryStrength * w.militaryStrength;

  // Heresy VP
  const h = player.heresyTracker;
  const heresyVP = player.hereticOrOrthodox === "orthodox" ? -h : h;
  score += Math.max(0, heresyVP) * w.heresyVP;

  // Debt — match actual game formula: floor(abs(gold) / 5) VP lost
  const debt = Math.max(0, -player.resources.gold);
  const debtVPLoss = Math.floor(debt / 5);
  score -= debtVPLoss * w.debtPenalty;

  // Goods income — estimate gold from connected outpost/colony goods at current prices
  let goodsIncome = 0;
  const markers = G.mapState.goodsPriceMarkers;
  const GOOD_KEYS: (keyof typeof markers)[] = ["mithril", "dragonScales", "krakenSkin", "magicDust", "stickyIchor", "pipeweed"];
  G.mapState.buildings.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell.player?.id !== playerID || !cell.buildings) return;
      if (cell.buildings !== "outpost" && cell.buildings !== "colony") return;
      const tile = G.mapState.currentTileArray[y]?.[x];
      if (!tile?.loot) return;
      const loot = tile.loot[cell.buildings];
      for (const good of GOOD_KEYS) {
        goodsIncome += (loot[good] ?? 0) * markers[good];
      }
      goodsIncome += loot.gold ?? 0;
    })
  );
  score += goodsIncome * 0.1;

  score -= (player.freeDissenters ?? 0) * w.dissenterPenalty;

  return score;
}
