/**
 * V2 Evaluators: miscellaneous action moves
 *
 * Each evaluator reads game state and returns a quality score.
 * No hardcoded values without game-state justification.
 */
import type { MyGameState } from "../../../types";
import type { AIMove } from "../../types";
import type { MoveEval, BotPersonality } from "../types";
import { V2_CONFIG } from "../config";
import { goldPressure, goldPressureReason, personalityBonus, diminishingReturns, heresyPressure, tradeRouteChainValue } from "../common";
import { countActiveTradeRoutes } from "../../../helpers/mapUtils";
import { KINGDOM_LOCATION } from "../../../data/gameData";

function clampEval(move: AIMove, quality: number, reason: string): MoveEval {
  quality = Math.max(0, Math.min(1, quality));
  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason,
  };
}

// ── pass ─────────────────────────────────────────────────────────────────────

export function evaluatePass(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const gold = player.resources.gold;
  const counsellors = player.resources.counsellors;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.pass;

  // If broke and no counsellors left, passing is the right call
  if (gold < -5 && counsellors <= 1) {
    quality += V2_CONFIG.bonuses.brokePassBonus;
    reasons.push("broke + low counsellors");
  } else if (gold < 0) {
    quality += V2_CONFIG.bonuses.debtPassBonus;
    reasons.push("in debt");
  }

  // Late game, passing can be fine if you've done your key actions
  if (G.round >= G.finalRound) {
    quality += V2_CONFIG.round.finalRoundBonus;
  }

  return clampEval(move, quality, `pass. ${reasons.join(", ")}`);
}

// ── confirmAction ────────────────────────────────────────────────────────────

export function evaluateConfirmAction(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // confirmAction ends your turn after a counsellor action.
  // It's viable when turnComplete=true. The question is:
  // should you do anytime actions first (sendAgitators, garrisonTransfer)?
  // We give it moderate quality — if anytime actions score higher, they'll be picked.
  const player = G.playerInfo[playerID];

  let quality = V2_CONFIG.baseQuality.confirmAction;
  const reasons: string[] = [];

  // If there are free dissenters, maybe punish first
  if (player.freeDissenters > 0) {
    quality -= V2_CONFIG.bonuses.unpunishedDissentersPenalty * V2_CONFIG.penaltyScale;
    reasons.push("free dissenters unpunished");
  }

  return clampEval(move, quality, `confirm action (end turn). ${reasons.join(", ")}`);
}

// ── discardFoWCard ───────────────────────────────────────────────────────────

export function evaluateDiscardFoWCard(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const cardIndex = move.args[0] as number;
  const hand = player.resources.fortuneCards;
  const card = hand[cardIndex];
  const reasons: string[] = [];

  if (!card) {
    return clampEval(move, 0, "invalid card index");
  }

  // Discard the weakest card — higher combined value = keep, lower = discard
  const cardValue = card.sword + card.shield;
  let quality = V2_CONFIG.baseQuality.discardFoWCard;

  // Find min and max card values in hand for relative scoring
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (const c of hand) {
    const v = c.sword + c.shield;
    if (v < minValue) minValue = v;
    if (v > maxValue) maxValue = v;
  }

  if (cardValue === minValue) {
    quality += V2_CONFIG.bonuses.weakCardBonus;
    reasons.push(`weakest card (${card.sword}sw/${card.shield}sh)`);
  } else if (cardValue === maxValue) {
    quality -= V2_CONFIG.bonuses.strongCardPenalty * V2_CONFIG.penaltyScale;
    reasons.push(`strongest card (${card.sword}sw/${card.shield}sh) — keep this`);
  } else {
    reasons.push(`mid card (${card.sword}sw/${card.shield}sh)`);
  }

  return clampEval(move, quality, `discard card ${cardIndex}. ${reasons.join(", ")}`);
}

// ── punishDissenters ─────────────────────────────────────────────────────────

export function evaluatePunishDissenters(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const dissenters = player.freeDissenters;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.punishDissenters;

  if (dissenters >= 3) {
    quality += V2_CONFIG.bonuses.urgentDissenters;
    reasons.push(`${dissenters} free dissenters (urgent)`);
  } else if (dissenters >= 1) {
    quality += V2_CONFIG.bonuses.someDissenters;
    reasons.push(`${dissenters} free dissenters`);
  } else {
    return clampEval(move, 0, "no free dissenters");
  }

  // Payment type matters: gold (2g) vs counsellor (free but costs action) vs execute (costs VP)
  const paymentType = move.args[1] as string;
  if (paymentType === "gold") {
    quality += goldPressure(player.resources.gold, 2);
    const gpReason = goldPressureReason(player.resources.gold, 2);
    if (gpReason) reasons.push(gpReason);
  } else if (paymentType === "execute") {
    quality -= V2_CONFIG.bonuses.executeVPCost * V2_CONFIG.penaltyScale;
    reasons.push("execute costs VP");
  }

  const pb = personalityBonus(personality, {
    kaCards: ["more_prisons", "patriarch_of_the_church"],
    legacyCards: ["the pious"],
    kaBonus: 0.08,
    legacyBonus: 0.06,
  });
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  return clampEval(move, quality, `punish (${paymentType}). ${reasons.join(", ")}`);
}

// ── garrisonTransfer ─────────────────────────────────────────────────────────

export function evaluateGarrisonTransfer(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // Free action. Args: [fleetId, location, regs, levies, elites]
  // Positive = fleet→garrison, negative = garrison→fleet
  const regs = (move.args[2] as number) ?? 0;
  const levies = (move.args[3] as number) ?? 0;
  const elites = (move.args[4] as number) ?? 0;
  const isToGarrison = regs > 0 || levies > 0 || elites > 0;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.garrisonTransfer;

  if (isToGarrison) {
    const location = move.args[1] as number[];
    const building = G.mapState.buildings[location[1]]?.[location[0]];
    const currentGarrison =
      (building?.garrisonedRegiments ?? 0) +
      (building?.garrisonedLevies ?? 0) +
      (building?.garrisonedEliteRegiments ?? 0);

    if (currentGarrison === 0) {
      quality += V2_CONFIG.bonuses.emptyGarrison;
      reasons.push("empty garrison (needs defense)");
    } else {
      const dim = diminishingReturns(currentGarrison, 0.08, 5);
      quality -= dim.penalty;
      if (dim.reason) reasons.push(dim.reason);
    }
  } else {
    quality += V2_CONFIG.bonuses.loadFleetFromGarrisonBonus;
    reasons.push("loading fleet from garrison");
  }

  return clampEval(move, quality, `garrison transfer. ${reasons.join(", ")}`);
}

// ── moveFleet ────────────────────────────────────────────────────────────────

export function evaluateMoveFleet(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  // Args: [fleetIndex, [destX, destY]]
  const player = G.playerInfo[playerID];
  const gold = player.resources.gold;
  const dest = move.args[1] as [number, number];
  const cost = 1; // 1-3g
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.moveFleet;

  // Destination analysis (similar to deployFleet but for already-deployed fleets)
  if (dest) {
    const [dx, dy] = dest;
    const tile = G.mapState.currentTileArray[dy]?.[dx];
    const building = G.mapState.buildings[dy]?.[dx];
    const rivalsOnTile = (G.mapState.battleMap[dy]?.[dx] ?? []).filter(
      (id: string) => id !== playerID
    ).length;

    if (tile?.type === "land") {
      if (!building?.player) {
        quality += V2_CONFIG.bonuses.unclaimedLand;
        reasons.push("unclaimed land");
      } else if (building.player.id === playerID) {
        quality += V2_CONFIG.bonuses.ownTerritory;
        reasons.push("own territory");
      } else {
        quality += V2_CONFIG.bonuses.rivalTerritory;
        reasons.push("rival territory");
      }
    } else if (tile?.type === "legend") {
      quality += V2_CONFIG.bonuses.legendTile;
      reasons.push("legend tile");
    } else {
      quality -= V2_CONFIG.tile.oceanPenalty * V2_CONFIG.penaltyScale;
      reasons.push("ocean/home");
    }

    if (rivalsOnTile >= 2) {
      quality -= V2_CONFIG.tile.multiRivalPenalty * V2_CONFIG.penaltyScale;
      reasons.push(`${rivalsOnTile} rivals`);
    }

    // ── Route chain value — does moving here help complete a trade route? ──
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

  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  const pb = personalityBonus(personality, {
    kaCards: ["sanctioned_piracy"],
    legacyCards: ["the navigator", "the conqueror"],
    kaBonus: 0.06,
    legacyBonus: 0.05,
  });
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  return clampEval(move, quality, `move fleet to [${dest?.[0]},${dest?.[1]}]. ${reasons.join(", ")}`);
}

// ── buildSkyships ────────────────────────────────────────────────────────────

export function evaluateBuildSkyships(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const shipyards = player.shipyards;
  const skyships = player.resources.skyships;
  const gold = player.resources.gold;
  const cost = shipyards; // 1g per shipyard
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.buildSkyships;

  if (shipyards === 0) {
    return clampEval(move, 0, "no shipyards");
  }

  // More valuable when low on skyships
  if (skyships < 2) {
    quality += V2_CONFIG.bonuses.lowSkyshipsBonus;
    reasons.push("low skyships");
  }

  // Cheaper than purchasing (1g/ship vs 1.5-2g/ship) — good deal if you have shipyards
  reasons.push(`${shipyards} shipyards → ${shipyards} ships for ${cost}g`);

  // Diminishing if already have many
  const dim = diminishingReturns(skyships, 0.03, 8);
  quality -= dim.penalty;
  if (dim.reason) reasons.push(dim.reason);

  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  const pb = personalityBonus(personality, {
    legacyCards: ["the aviator", "the navigator"],
    legacyBonus: 0.06,
  });
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  return clampEval(move, quality, `build skyships. ${reasons.join(", ")}`);
}

// ── conscriptLevies ──────────────────────────────────────────────────────────

export function evaluateConscriptLevies(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // Free action — get 3 levies. Weaker than regiments but free.
  const player = G.playerInfo[playerID];
  const totalTroops = player.resources.regiments + player.resources.levies + player.resources.eliteRegiments;
  const gold = player.resources.gold;
  const activeFleets = player.fleetInfo.filter(f => f.skyships > 0).length;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.conscriptLevies;

  // More valuable when low on troops
  if (totalTroops < 3) {
    quality += V2_CONFIG.bonuses.veryLowTroopsBonus;
    reasons.push("very low troops");
  } else if (totalTroops < 6) {
    quality += V2_CONFIG.bonuses.lowTroopsBuildBonus;
    reasons.push("low troops");
  }

  // More valuable if can't afford regiments
  if (gold < 2) {
    quality += V2_CONFIG.bonuses.cantAffordRegimentsBonus;
    reasons.push("can't afford regiments");
  }

  // Less useful if no fleets to load onto
  if (activeFleets === 0 && player.resources.skyships === 0) {
    quality -= V2_CONFIG.bonuses.noFleetsOrSkyships * V2_CONFIG.penaltyScale;
    reasons.push("no fleets or skyships");
  }

  return clampEval(move, quality, `conscript levies, troops=${totalTroops}. ${reasons.join(", ")}`);
}

// ── convertMonarch ───────────────────────────────────────────────────────────

export function evaluateConvertMonarch(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  const player = G.playerInfo[playerID];
  const gold = player.resources.gold;
  const cost = 2; // 2g + counsellor
  const heresyPos = player.heresyTracker;
  const alignment = player.hereticOrOrthodox;
  const legacyColour = personality.legacyCardColour;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.convertMonarch;

  // Core question: is my alignment mismatched with my legacy card?
  // If aligned → conversion is almost never worth it
  // If misaligned → conversion fixes legacy card scoring (half → full VP)
  const cardWantsOrthodox = legacyColour === "purple";
  const isOrthodox = alignment === "orthodox";
  const isAligned = cardWantsOrthodox === isOrthodox;

  if (legacyColour === "none" || isAligned) {
    // Already aligned or no card — conversion is bad
    quality -= V2_CONFIG.bonuses.vpCostPenalty;
    reasons.push("already aligned with legacy card");
  } else {
    // Misaligned — conversion would fix legacy scoring
    quality += V2_CONFIG.bonuses.misalignedBonus;
    reasons.push("misaligned with legacy card — conversion helps");

    // Bonus scales with round (converting later = less time misaligned ahead)
    if (G.round >= G.finalRound - 1) {
      quality += V2_CONFIG.round.finalRoundBonus;
      reasons.push("late-game conversion locks in legacy VP");
    }
  }

  // Check building conflicts: converting orthodox→heretic loses cathedral ability
  if (isOrthodox && player.cathedrals >= 3) {
    quality -= V2_CONFIG.bonuses.cathedralConversionPenalty;
    reasons.push(`${player.cathedrals} cathedrals invested — conversion wastes them`);
  }

  // Converting releases all imprisoned dissenters — heresy shifts
  if (player.freeDissenters > 0) {
    // Already have free dissenters, conversion adds more instability
    quality -= V2_CONFIG.bonuses.dissenterConversionPenalty;
    reasons.push("free dissenters would increase on conversion");
  }

  // Heresy position check
  const hp = heresyPressure(alignment, heresyPos, legacyColour);
  if (hp.modifier < 0) {
    // Misaligned heresy position adds urgency to convert
    quality += Math.abs(hp.modifier) * 0.5;
    if (hp.reason) reasons.push(hp.reason);
  }

  // Gold pressure
  quality += goldPressure(gold, cost);
  const gpReason = goldPressureReason(gold, cost);
  if (gpReason) reasons.push(gpReason);

  return clampEval(move, quality, `convert monarch (${move.args[0]}). ${reasons.join(", ")}`);
}

// ── alterPlayerOrder ─────────────────────────────────────────────────────────

export function evaluateAlterPlayerOrder(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // Costs a counsellor. Going first matters for slot-based actions.
  const player = G.playerInfo[playerID];
  const counsellors = player.resources.counsellors;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.alterPlayerOrder;

  // Only worth it if you have spare counsellors
  if (counsellors <= 4) {
    quality -= V2_CONFIG.bonuses.lowTroops * V2_CONFIG.penaltyScale;
    reasons.push("low counsellors");
  }

  // More useful in early rounds when slots matter
  if (G.round <= 2) {
    quality += V2_CONFIG.round.finalRoundBonus;
    reasons.push("early game (slots matter)");
  }

  return clampEval(move, quality, `alter order to pos ${move.args[0]}. ${reasons.join(", ")}`);
}

// ── sellSkyships / sellBuilding ──────────────────────────────────────────────

export function evaluateSellSkyships(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  const gold = G.playerInfo[playerID].resources.gold;
  const skyships = G.playerInfo[playerID].resources.skyships;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.sellSkyships;

  // Selling skyships when deeply in debt and have many
  if (gold < -10 && skyships > 4) {
    quality += V2_CONFIG.bonuses.deepDebtSellBonus;
    reasons.push("deep debt + spare skyships");
  } else if (gold < -5) {
    quality += V2_CONFIG.bonuses.mildDebtSellBonus;
    reasons.push("in debt");
  }

  // Selling last skyships is terrible
  if (skyships <= 2) {
    quality -= V2_CONFIG.bonuses.lowSkyshipsSellPenalty * V2_CONFIG.penaltyScale;
    reasons.push("low skyships — don't sell");
  }

  return clampEval(move, quality, `sell skyships (gold:${gold}, sky:${skyships}). ${reasons.join(", ")}`);
}

export function evaluateSellBuilding(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  const gold = G.playerInfo[playerID].resources.gold;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.sellBuilding;

  // Only sell buildings in extreme debt
  if (gold < -15) {
    quality += V2_CONFIG.bonuses.mildDebtSellBonus;
    reasons.push("extreme debt");
  }

  return clampEval(move, quality, `sell building (gold:${gold}). ${reasons.join(", ")}`);
}

// ── declareSmugglerGood ──────────────────────────────────────────────────────

export function evaluateDeclareSmugglerGood(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  const goodName = move.args[0] as string;
  const markers = G.mapState.goodsPriceMarkers as Record<string, number>;
  const price = markers[goodName] ?? 1;
  const maxPrice = Math.max(...Object.values(markers));
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.declareSmugglerGood;

  if (price === maxPrice) {
    quality += V2_CONFIG.bonuses.highGoodPrice;
    reasons.push(`best price (${price}g)`);
  } else if (price === maxPrice - 1) {
    quality += V2_CONFIG.bonuses.decentGoodPrice;
    reasons.push(`near-best price (${price}g)`);
  } else {
    quality -= V2_CONFIG.bonuses.decentGoodPrice * V2_CONFIG.penaltyScale;
    reasons.push(`cheap (${price}g)`);
  }

  // Penalize goods that are being flooded by outpost/colony production
  let supplyPressure = 0;
  for (let y = 0; y < G.mapState.buildings.length; y++) {
    for (let x = 0; x < G.mapState.buildings[y].length; x++) {
      const cell = G.mapState.buildings[y][x];
      if (!cell.buildings || !cell.player) continue;
      const tile = G.mapState.currentTileArray[y]?.[x];
      if (!tile?.loot) continue;
      const lootKey = cell.buildings === "colony" ? "colony" : "outpost";
      const qty = (tile.loot[lootKey] as Record<string, number>)?.[goodName] ?? 0;
      supplyPressure += qty;
    }
  }
  if (supplyPressure >= 3) {
    quality -= 0.10;
    reasons.push(`high supply (${supplyPressure} produced/round)`);
  } else if (supplyPressure >= 1) {
    quality -= 0.04;
    reasons.push(`some supply (${supplyPressure})`);
  }

  return clampEval(move, quality, `smuggle ${goodName} @${price}g. ${reasons.join(", ")}`);
}

// ── checkAndPlaceFort ────────────────────────────────────────────────────────

export function evaluateCheckAndPlaceFort(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // Already paid for the fort — choosing where to place it.
  // Prefer tiles that have no garrison and are at risk.
  const coords = move.args[0] as [number, number];
  const [x, y] = coords;
  const building = G.mapState.buildings[y]?.[x];
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.checkAndPlaceFort; // always viable since already paid

  // Prefer unprotected territories
  const garrison =
    (building?.garrisonedRegiments ?? 0) +
    (building?.garrisonedLevies ?? 0) +
    (building?.garrisonedEliteRegiments ?? 0);

  if (garrison === 0) {
    quality += V2_CONFIG.bonuses.rivalsPresent;
    reasons.push("ungarrisoned tile");
  }

  // Prefer colonies over outposts (more to lose)
  if (building?.buildings === "colony") {
    quality += V2_CONFIG.bonuses.colonyValue;
    reasons.push("colony (high value)");
  }

  // Check if rivals are nearby
  const rivalsOnTile = (G.mapState.battleMap[y]?.[x] ?? []).filter(
    (id: string) => id !== playerID
  ).length;
  if (rivalsOnTile > 0) {
    quality += V2_CONFIG.bonuses.rivalsPresent;
    reasons.push("rivals present (fort needed)");
  }

  return clampEval(move, quality, `place fort at [${x},${y}]. ${reasons.join(", ")}`);
}

// ── issueHolyDecree ──────────────────────────────────────────────────────────

export function evaluateIssueHolyDecree(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  personality: BotPersonality,
): MoveEval {
  // Only archprelate can do this. Costs counsellor + gold.
  const player = G.playerInfo[playerID];
  const gold = player.resources.gold;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.issueHolyDecree;

  // More valuable when many rivals have dissenters (decree affects everyone)
  let totalRivalDissenters = 0;
  for (const [id, info] of Object.entries(G.playerInfo)) {
    if (id !== playerID) totalRivalDissenters += info.freeDissenters;
  }
  if (totalRivalDissenters >= 3) {
    quality += V2_CONFIG.bonuses.rivalDissentersBonus;
    reasons.push(`${totalRivalDissenters} rival dissenters`);
  }

  quality += goldPressure(gold, 2);
  const gpReason = goldPressureReason(gold, 2);
  if (gpReason) reasons.push(gpReason);

  const pb = personalityBonus(personality, {
    kaCards: ["patriarch_of_the_church"],
    legacyCards: ["the pious"],
    kaBonus: 0.10,
    legacyBonus: 0.06,
  });
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  return clampEval(move, quality, `holy decree. ${reasons.join(", ")}`);
}

// ── transferBetweenFleets ────────────────────────────────────────────────────

export function evaluateTransferBetweenFleets(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // Free action. Transfer troops from one fleet to another at same location.
  // Useful for consolidating forces before battle.
  const srcIdx = move.args[0] as number;
  const tgtIdx = move.args[1] as number;
  const player = G.playerInfo[playerID];
  const src = player.fleetInfo[srcIdx];
  const tgt = player.fleetInfo[tgtIdx];
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.transferBetweenFleets;

  if (!src || !tgt) return clampEval(move, 0, "invalid fleet indices");

  const tgtTroops = tgt.regiments + tgt.levies + tgt.eliteRegiments;
  if (tgt.skyships > 0 && tgtTroops === 0) {
    quality += V2_CONFIG.bonuses.targetNeedsTroops;
    reasons.push("target fleet needs troops");
  } else {
    const dim = diminishingReturns(tgtTroops, 0.08, 5);
    quality -= dim.penalty;
    if (dim.reason) reasons.push(dim.reason);
  }

  const [fx, fy] = src.location;
  const rivalsHere = (G.mapState.battleMap[fy]?.[fx] ?? []).filter(
    (id: string) => id !== playerID
  ).length;
  if (rivalsHere > 0) {
    quality += V2_CONFIG.bonuses.rivalsAtLocation;
    reasons.push("rivals at location (combat prep)");
  }

  return clampEval(move, quality, `transfer fleets ${srcIdx}→${tgtIdx}. ${reasons.join(", ")}`);
}

// ── transferOutpost ──────────────────────────────────────────────────────────

export function evaluateTransferOutpost(
  G: MyGameState,
  playerID: string,
  move: AIMove,
  _personality: BotPersonality,
): MoveEval {
  // Transfer outpost ownership to a rival whose fleet is on the tile.
  // Rare. Could help ally complete a trade route.
  const coords = move.args[0] as [number, number];
  const targetID = move.args[1] as string;
  const reasons: string[] = [];

  let quality = V2_CONFIG.baseQuality.transferOutpost;

  // Check if this outpost is useful to us (routes)
  const routes = countActiveTradeRoutes(G, playerID);
  const building = G.mapState.buildings[coords[1]]?.[coords[0]];

  if (building?.buildings === "colony") {
    quality -= V2_CONFIG.bonuses.givingColonyPenalty * V2_CONFIG.penaltyScale;
    reasons.push("giving away a colony (high cost)");
  }

  // If we have surplus outposts and no routes through this one, less painful
  if (routes === 0) {
    reasons.push("no active routes anyway");
  } else {
    quality -= V2_CONFIG.bonuses.breakRoutePenalty * V2_CONFIG.penaltyScale;
    reasons.push("might break active route");
  }

  return clampEval(move, quality, `transfer outpost [${coords}] to P${targetID}. ${reasons.join(", ")}`);
}
