/**
 * V2 Resolution Phase Evaluator
 *
 * Handles all resolution sub-stages: battles, conquest, election,
 * fleet retrieval, invasions, rebellions, etc.
 * Most sub-stages have 2-3 choices — all are kept viable for MCTS.
 */
import type { MyGameState } from "../../../types.js";
import type { AIMove } from "../../types.js";
import type { MoveEval, BotPersonality } from "../types.js";
import { V2_CONFIG } from "../config.js";
import { personalityBonus, countOutposts } from "../common.js";
import { countActiveTradeRoutes } from "../../../helpers/mapUtils.js";

// Generic evaluator for binary/ternary decisions

function simpleEval(move: AIMove, quality: number, reason: string): MoveEval {
  quality = Math.max(0, Math.min(1, quality));
  return {
    move,
    viable: quality >= V2_CONFIG.qualityThreshold,
    quality,
    reason,
  };
}

// Aerial Battle

function evaluateAerialAttackOrPass(
  G: MyGameState, playerID: string, move: AIMove, personality: BotPersonality,
): MoveEval {
  if (move.move === "doNotAttack") {
    return simpleEval(move, V2_CONFIG.resolution.doNotAttackBase, "do not attack (safe)");
  }
  // attackOtherPlayersFleet
  const player = G.playerInfo[playerID];
  const fowCards = player.resources.fortuneCards?.length ?? 0;
  let quality = V2_CONFIG.resolution.attackBase;
  const reasons: string[] = [];

  if (fowCards >= 2) {
    quality += V2_CONFIG.resolution.fowCardsBonus;
    reasons.push("have FoW cards");
  }

  const pb = personalityBonus(personality, {
    kaCards: ["elite_regiments"],
    legacyCards: ["the mighty", "the conqueror"],
    kaBonus: 0.08,
    legacyBonus: 0.06,
  });
  quality += pb.bonus;
  reasons.push(...pb.reasons);

  return simpleEval(move, quality, `attack fleet. ${reasons.join(", ")}`);
}

function evaluateAerialEvadeOrFight(
  G: MyGameState, playerID: string, move: AIMove, personality: BotPersonality,
): MoveEval {
  if (move.move === "evadeAttackingFleet") {
    return simpleEval(move, V2_CONFIG.resolution.evadeBase, "evade (retreat to safety)");
  }
  // retaliate
  const player = G.playerInfo[playerID];
  const fowCards = player.resources.fortuneCards?.length ?? 0;
  let quality = V2_CONFIG.resolution.retaliateBase;
  if (fowCards >= 2) quality += V2_CONFIG.resolution.fowCardsBonus;

  const pb = personalityBonus(personality, {
    kaCards: ["elite_regiments"],
    legacyCards: ["the mighty"],
    kaBonus: 0.08,
    legacyBonus: 0.06,
  });
  quality += pb.bonus;

  return simpleEval(move, quality, `retaliate (fight back, FoW:${fowCards})`);
}

// FoW Card Selection (aerial_resolve, ground_resolve)

function evaluateCardSelection(
  G: MyGameState, playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  if (move.move === "drawCard") {
    return simpleEval(move, V2_CONFIG.resolution.drawCardBase, "draw random card");
  }
  if (move.move === "pass") {
    return simpleEval(move, V2_CONFIG.resolution.passCardBase, "pass (no card)");
  }
  // pickCard — choose from hand
  const cardIndex = move.args[0] as number;
  const card = G.playerInfo[playerID].resources.fortuneCards[cardIndex];
  if (!card) return simpleEval(move, V2_CONFIG.resolution.passCardBase, "invalid card");

  const value = card.sword + card.shield;
  let quality = V2_CONFIG.resolution.pickCardBase;
  if (value >= 8) quality += V2_CONFIG.bonuses.strongCardBonus;
  else if (value >= 5) quality += V2_CONFIG.bonuses.midCardBonus;

  return simpleEval(move, quality, `play card ${cardIndex} (${card.sword}sw/${card.shield}sh)`);
}

function evaluatePlunder(
  G: MyGameState, playerID: string, move: AIMove, personality: BotPersonality,
): MoveEval {
  if (move.move === "doNotPlunder") {
    return simpleEval(move, V2_CONFIG.resolution.doNotPlunderBase, "do not plunder");
  }
  let quality = V2_CONFIG.resolution.plunderBase;
  const pb = personalityBonus(personality, {
    legacyCards: ["the merchant", "the conqueror"],
    legacyBonus: V2_CONFIG.personality.legacyBonus,
  });
  quality += pb.bonus;
  return simpleEval(move, quality, `plunder legend tile`);
}

// Ground Battle

function evaluateGroundAttackOrPass(
  G: MyGameState, playerID: string, move: AIMove, personality: BotPersonality,
): MoveEval {
  if (move.move === "doNotGroundAttack") {
    return simpleEval(move, V2_CONFIG.resolution.doNotGroundAttackBase, "do not ground attack");
  }
  let quality = V2_CONFIG.resolution.groundAttackBase;
  const pb = personalityBonus(personality, {
    kaCards: ["elite_regiments"],
    legacyCards: ["the conqueror", "the mighty"],
    kaBonus: 0.08,
    legacyBonus: 0.06,
  });
  quality += pb.bonus;
  return simpleEval(move, quality, `ground attack`);
}

function evaluateGroundDefendOrYield(
  _G: MyGameState, _playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  if (move.move === "yieldToAttacker") {
    return simpleEval(move, V2_CONFIG.resolution.yieldBase, "yield ground (retreat)");
  }
  return simpleEval(move, V2_CONFIG.resolution.defendBase, "defend ground (fight)");
}

function evaluateGarrisonTroops(
  _G: MyGameState, _playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  const troops = move.args[0] as number[];
  const total = troops ? troops.reduce((a, b) => a + b, 0) : 0;

  if (total === 0) return simpleEval(move, V2_CONFIG.resolution.garrisonNoneBase, "garrison none");
  return simpleEval(move, V2_CONFIG.resolution.garrisonTroopsBase, `garrison ${total} troops`);
}

function evaluateConquest(
  G: MyGameState, playerID: string, move: AIMove, personality: BotPersonality,
): MoveEval {
  if (move.move === "doNothing") {
    return simpleEval(move, V2_CONFIG.resolution.skipConquestBase, "skip conquest");
  }
  if (move.move === "coloniseLand") {
    let quality = V2_CONFIG.resolution.coloniseBase;
    const routes = countActiveTradeRoutes(G, playerID);
    if (routes === 0) {
      quality += V2_CONFIG.resolution.conquestNoRouteBonus;
    }
    const pb = personalityBonus(personality, {
      legacyCards: ["the conqueror", "the navigator", "the merchant"],
      legacyBonus: V2_CONFIG.personality.legacyBonus,
    });
    quality += pb.bonus;
    return simpleEval(move, quality, "colonise land (colony)");
  }
  if (move.move === "constructOutpost") {
    let quality = V2_CONFIG.resolution.outpostBase;
    const routes = countActiveTradeRoutes(G, playerID);
    if (routes === 0) quality += V2_CONFIG.resolution.conquestNoRouteBonus;
    return simpleEval(move, quality, "construct outpost");
  }
  return simpleEval(move, V2_CONFIG.resolution.fallbackConquestBase, `conquest: ${move.move}`);
}

// Conquest Card Draw

function evaluateConquestCard(
  G: MyGameState, playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  if (move.move === "drawCardConquest") {
    return simpleEval(move, V2_CONFIG.resolution.conquestCardBase, "draw conquest card");
  }
  // pickCardConquest — play from hand
  const cardIndex = move.args[0] as number;
  const card = G.playerInfo[playerID].resources.fortuneCards[cardIndex];
  if (!card) return simpleEval(move, V2_CONFIG.resolution.conquestCardPickBase, "invalid card");
  const value = card.sword + card.shield;
  let quality = V2_CONFIG.resolution.conquestCardPickBase;
  if (value >= 6) quality += V2_CONFIG.resolution.conquestCardHighBonus;
  else if (value >= 4) quality += V2_CONFIG.resolution.conquestCardMidBonus;
  return simpleEval(move, quality, `play conquest card ${cardIndex} (${card.sword}sw/${card.shield}sh)`);
}

function evaluateElection(
  G: MyGameState, playerID: string, move: AIMove, personality: BotPersonality,
): MoveEval {
  const targetID = move.args[0] as string;
  const player = G.playerInfo[playerID];
  let quality = V2_CONFIG.resolution.electionBase;
  const reasons: string[] = [];

  if (targetID === playerID) {
    if (player.cathedrals >= 2) {
      quality += V2_CONFIG.events.cathedralVoteBonus;
      reasons.push("vote self (have cathedrals)");
    } else {
      quality += V2_CONFIG.events.selfVoteBonus;
      reasons.push("vote self");
    }

    const pb = personalityBonus(personality, {
      kaCards: ["patriarch_of_the_church"],
      legacyCards: ["the pious"],
      kaBonus: 0.1,
      legacyBonus: 0.06,
    });
    quality += pb.bonus;
    reasons.push(...pb.reasons);
  }

  return simpleEval(move, quality, `vote P${targetID}. ${reasons.join(", ")}`);
}

// Relocate Defeated Fleet

function evaluateRelocate(
  _G: MyGameState, _playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  // All relocation destinations are roughly equivalent
  return simpleEval(move, V2_CONFIG.resolution.relocateBase, `relocate to [${move.args[0]}]`);
}

// Retrieve Fleets

function evaluateRetrieveFleets(
  G: MyGameState, playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  if (move.move === "pass") {
    // Keep fleets deployed — important for trade routes
    const routes = countActiveTradeRoutes(G, playerID);
    let quality = V2_CONFIG.resolution.keepFleetsBase;
    if (routes > 0) {
      quality += V2_CONFIG.resolution.routeKeepBonus;
    }
    return simpleEval(move, quality, `keep fleets (routes:${routes})`);
  }
  // retrieveFleets — bring some/all home
  const indices = move.args[0] as number[];
  const options = move.args[1] as { placeAt?: number[]; trailFrom?: number[] } | undefined;

  if (options?.placeAt?.length) {
    // Place-at-fleet: high value — directly repairs a broken route
    const quality = V2_CONFIG.resolution.retrieveBase + V2_CONFIG.resolution.placeAtBonus;
    return simpleEval(move, quality, `retrieve + place route skyship (repairs route)`);
  }

  if (options?.trailFrom?.length) {
    // Trail: moderate-high value — creates new route chain
    const routes = countActiveTradeRoutes(G, playerID);
    let quality = V2_CONFIG.resolution.retrieveBase + V2_CONFIG.resolution.trailBonus;
    // Extra bonus if player has outposts but fewer active routes
    const outpostCount = countOutposts(G, playerID);
    if (outpostCount > routes) quality += V2_CONFIG.resolution.trailDisconnectedBonus;
    return simpleEval(move, quality, `retrieve + trail (routes:${routes}, outposts:${outpostCount})`);
  }

  // Plain retrieve
  let quality = V2_CONFIG.resolution.retrieveBase;
  if (indices.length === 1) {
    quality += V2_CONFIG.bonuses.selectiveRetrievalBonus;
  }
  return simpleEval(move, quality, `retrieve ${indices.length} fleet(s)`);
}

// Infidel Fleet

function evaluateInfidelFleet(
  _G: MyGameState, _playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  const choice = move.args[0] as string;
  if (choice === "fight") return simpleEval(move, V2_CONFIG.resolution.infidelFightBase, "fight infidel fleet");
  return simpleEval(move, V2_CONFIG.resolution.infidelEvadeBase, "evade infidel fleet");
}

function evaluateRebellion(
  _G: MyGameState, _playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  if (move.move === "pass") return simpleEval(move, V2_CONFIG.resolution.rebellionPassBase, "pass rebellion");
  if (move.move === "commitRebellionTroops") {
    const regs = (move.args[0] as number) ?? 0;
    const levs = (move.args[1] as number) ?? 0;
    if (regs + levs === 0) return simpleEval(move, V2_CONFIG.resolution.rebellionPassBase, "commit no troops");
    return simpleEval(move, V2_CONFIG.resolution.rebellionCommitBase, `commit ${regs}r ${levs}l to rebellion`);
  }
  if (move.move === "contributeToRebellion") {
    const side = move.args[0] as string;
    const regs = (move.args[1] as number) ?? 0;
    if (regs === 0) return simpleEval(move, V2_CONFIG.resolution.rebellionSupportNoTroopsBase, `support ${side} (no troops)`);
    return simpleEval(move, V2_CONFIG.resolution.rebellionSupportBase, `support ${side} with ${regs} troops`);
  }
  return simpleEval(move, V2_CONFIG.resolution.rebellionFallbackBase, `rebellion: ${move.move}`);
}

function evaluateInvasion(
  _G: MyGameState, _playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  if (move.move === "pass") return simpleEval(move, V2_CONFIG.resolution.invasionPassBase, "pass invasion");
  if (move.move === "nominateCaptainGeneral") {
    return simpleEval(move, V2_CONFIG.resolution.invasionNominateBase, `nominate P${move.args[0]} as captain`);
  }
  if (move.move === "contributeToGrandArmy") {
    const regs = (move.args[0] as number) ?? 0;
    const levs = (move.args[1] as number) ?? 0;
    const total = regs + levs;
    if (total === 0) return simpleEval(move, V2_CONFIG.resolution.invasionContributeNoneBase, "contribute nothing");
    return simpleEval(move, V2_CONFIG.resolution.invasionContributeBase, `contribute ${total} troops to Grand Army`);
  }
  if (move.move === "offerBuyoffGold") {
    const gold = (move.args[0] as number) ?? 0;
    if (gold === 0) return simpleEval(move, V2_CONFIG.resolution.invasionBuyoffNoneBase, "offer no gold for buyoff");
    return simpleEval(move, V2_CONFIG.resolution.invasionBuyoffBase, `offer ${gold}g for buyoff`);
  }
  return simpleEval(move, V2_CONFIG.resolution.invasionFallbackBase, `invasion: ${move.move}`);
}

// Deferred Battle

function evaluateDeferredBattle(
  G: MyGameState, playerID: string, move: AIMove, _personality: BotPersonality,
): MoveEval {
  if (move.move === "pass") return simpleEval(move, V2_CONFIG.resolution.deferredPassBase, "pass deferred battle");
  // commitDeferredBattleCard
  if (move.args.length === 0) return simpleEval(move, V2_CONFIG.resolution.deferredDrawBase, "draw random for deferred");
  const cardIndex = move.args[0] as number;
  const card = G.playerInfo[playerID].resources.fortuneCards[cardIndex];
  if (!card) return simpleEval(move, V2_CONFIG.resolution.deferredPassBase, "invalid card");
  const value = card.sword + card.shield;
  let quality = V2_CONFIG.resolution.deferredCardBase;
  if (value >= 6) quality += V2_CONFIG.resolution.deferredCardHighBonus;
  return simpleEval(move, quality, `commit card ${cardIndex} (${card.sword}sw/${card.shield}sh)`);
}

// Main Resolution Evaluator

export function evaluateResolution(
  G: MyGameState,
  playerID: string,
  moves: AIMove[],
  personality: BotPersonality,
): { viable: MoveEval[]; filtered: MoveEval[] } {
  const viable: MoveEval[] = [];
  const filtered: MoveEval[] = [];
  const sub = G.step;

  for (const move of moves) {
    let result: MoveEval;

    if (sub === "aerial_attack_or_pass") {
      result = evaluateAerialAttackOrPass(G, playerID, move, personality);
    } else if (sub === "aerial_attack_or_evade") {
      result = evaluateAerialEvadeOrFight(G, playerID, move, personality);
    } else if (sub === "aerial_resolve" || sub === "ground_resolve") {
      result = evaluateCardSelection(G, playerID, move, personality);
    } else if (sub === "plunder_legends") {
      result = evaluatePlunder(G, playerID, move, personality);
    } else if (sub === "ground_attack_or_pass") {
      result = evaluateGroundAttackOrPass(G, playerID, move, personality);
    } else if (sub === "ground_defend_or_yield") {
      result = evaluateGroundDefendOrYield(G, playerID, move, personality);
    } else if (sub === "ground_garrison" || sub === "conquest_garrison") {
      result = evaluateGarrisonTroops(G, playerID, move, personality);
    } else if (sub === "conquest") {
      result = evaluateConquest(G, playerID, move, personality);
    } else if (sub === "conquest_draw_or_pick") {
      result = evaluateConquestCard(G, playerID, move, personality);
    } else if (sub === "election") {
      result = evaluateElection(G, playerID, move, personality);
    } else if (sub === "relocate_loser") {
      result = evaluateRelocate(G, playerID, move, personality);
    } else if (sub === "retrieve_fleets") {
      result = evaluateRetrieveFleets(G, playerID, move, personality);
    } else if (sub === "infidel_fleet_combat") {
      result = evaluateInfidelFleet(G, playerID, move, personality);
    } else if (sub === "rebellion" || sub === "rebellion_rival_support") {
      result = evaluateRebellion(G, playerID, move, personality);
    } else if (sub === "invasion_nominate" || sub === "invasion_contribute" || sub === "invasion_buyoff") {
      result = evaluateInvasion(G, playerID, move, personality);
    } else if (sub === "deferred_battle") {
      result = evaluateDeferredBattle(G, playerID, move, personality);
    } else {
      // Fallback for any unhandled sub-stage
      result = simpleEval(move, 0.35, `resolution/${sub}: ${move.move}`);
    }

    if (result.viable && result.quality >= V2_CONFIG.qualityThreshold) {
      viable.push(result);
    } else {
      filtered.push({ ...result, viable: false });
    }
  }

  return { viable, filtered };
}

export function pickResolutionMove(viable: MoveEval[]): MoveEval | null {
  if (viable.length === 0) return null;
  const idx = Math.floor(Math.random() * viable.length);
  return viable[idx];
}
