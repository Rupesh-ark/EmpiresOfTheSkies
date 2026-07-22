/**
 * resolveRebellion.ts
 *
 * Resolves rebellion battles during the Resolution phase.
 * Interactive stages (defender troop commitment, rival support) are handled
 * by moves in moves/events/commitRebellionTroops and contributeToRebellion.
 * This file provides the resolution logic called after interactive input.
 */

import { MyGameState, LegacyCardInfo } from "../types.js";
import {
  addVPAmount,
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  logEvent,
} from "./stateUtils.js";
import { calculateCombat } from "./combatMath.js";
import { drawFortuneOfWarCard, hasFortAt } from "./helpers.js";
import { CARD_RESOLVERS, resolveCardWithAlignmentPenalty } from "./legacyCardDefinitions.js";
import { KINGDOM_LOCATION } from "../data/gameData.js";

// Battle math

type BattleResult = {
  defenderWins: boolean;
  /** Hits landed on defender troops */
  hitsOnDefender: number;
  /** Hits landed on rebel counter */
  hitsOnRebel: number;
};

/**
 * Auto-resolve a rebellion battle.
 *
 * Rebel (attacker): contingent counter swords + 1 simulated FoW card
 * Defender: kingdom regiments (2S each) + levies (1S each) + 1 simulated FoW card
 * Fort at colony/kingdom: +1 shield per defending regiment/levy
 */
const calculateBattle = (
  rebelSwords: number,
  defenderRegiments: number,
  defenderLevies: number,
  hasFort: boolean,
  fowRebel: { sword: number; shield: number },
  fowDefender: { sword: number; shield: number }
): BattleResult => {
  // Defender attack strength
  const defenderBaseSwords = defenderRegiments * 2 + defenderLevies * 1;
  const defenderBaseShields = hasFort ? defenderRegiments + defenderLevies : 0;

  // Rebel = attacker, Defender = defender
  const { hitsOnDefender, hitsOnAttacker: hitsOnRebel } = calculateCombat(
    { swords: rebelSwords, shields: 0, fowSword: fowRebel.sword, fowShield: fowRebel.shield },
    { swords: defenderBaseSwords, shields: defenderBaseShields, fowSword: fowDefender.sword, fowShield: fowDefender.shield },
  );

  // Defender total HP (each regiment absorbs 2 hits, each levy absorbs 1)
  const defenderHP = defenderRegiments * 2 + defenderLevies;
  // Rebel HP = counter swords value
  const rebelHP = rebelSwords;

  // Rebels must eliminate ALL defenders to win; defender wins ties (B7)
  const rebelsEliminated = hitsOnRebel >= rebelHP;
  const defendersEliminated = hitsOnDefender >= defenderHP;

  const defenderWins = !defendersEliminated || rebelsEliminated;

  return { defenderWins, hitsOnDefender, hitsOnRebel };
};

/**
 * Apply hit damage to a player's kingdom troops.
 * Levies are lost first (1 hit each), then regiments (2 hits each).
 * Odd remaining hit is wasted per odd hit rule (B5).
 */
const applyTroopLosses = (
  G: MyGameState,
  playerID: string,
  hits: number
): void => {
  const player = G.playerInfo[playerID];
  const leviesLost = Math.min(hits, player.resources.levies);
  player.resources.levies -= leviesLost;
  hits -= leviesLost;

  const regimentsLost = Math.min(
    Math.floor(hits / 2),
    player.resources.regiments
  );
  player.resources.regiments -= regimentsLost;
};

// Per-card outcome handlers

const resolvePretenderRebellion = (
  G: MyGameState,
  targetID: string,
  defenderWins: boolean,
  shuffle: <T>(arr: T[]) => T[]
): void => {
  if (defenderWins) {
    addVPAmount(G, targetID, 1);
  } else {
    // Score current legacy card, reshuffle it, draw 1 new card
    const player = G.playerInfo[targetID];
    const currentCard = player.resources.legacyCard;
    if (currentCard) {
      resolveCardWithAlignmentPenalty(player, G, currentCard);
      G.cardDecks.legacyDeck.push(currentCard);
      player.resources.legacyCard = undefined;
    }
    // Draw 1 new card — shuffle deck then pop for deterministic PRNG
    if (G.cardDecks.legacyDeck.length > 0) {
      G.cardDecks.legacyDeck = shuffle(G.cardDecks.legacyDeck);
      player.resources.legacyCard = G.cardDecks.legacyDeck.pop()!;
    }
  }
};

const resolvePeasantRebellion = (
  G: MyGameState,
  targetID: string,
  defenderWins: boolean
): void => {
  if (defenderWins) {
    addVPAmount(G, targetID, 1);
  } else {
    G.eventState.skipTaxesNextRound = true;
  }
};

const resolveOrthodoxRebellion = (
  G: MyGameState,
  targetID: string,
  defenderWins: boolean
): void => {
  if (defenderWins) {
    addVPAmount(G, targetID, 1);
    increaseOrthodoxyWithinMove(G, targetID); // retreat heresy 1
  } else {
    // Convert monarch to Orthodox, free prisoners, can't convert back this round
    G.playerInfo[targetID].hereticOrOrthodox = "orthodox";
    G.playerInfo[targetID].prisoners = 0;
    G.eventState.cannotConvertThisRound.push(targetID);
  }
};

const resolveHereticRebellion = (
  G: MyGameState,
  targetID: string,
  defenderWins: boolean
): void => {
  if (defenderWins) {
    addVPAmount(G, targetID, 1);
    increaseHeresyWithinMove(G, targetID); // advance heresy 1
  } else {
    // Convert monarch to Heretic, free prisoners, can't convert back this round
    G.playerInfo[targetID].hereticOrOrthodox = "heretic";
    G.playerInfo[targetID].prisoners = 0;
    G.eventState.cannotConvertThisRound.push(targetID);
  }
};

const resolveColonialRebellion = (
  G: MyGameState,
  targetID: string,
  defenderWins: boolean,
  counterSwords: number,
  tile?: [number, number]
): void => {
  if (defenderWins) {
    addVPAmount(G, targetID, 1);
  } else if (tile) {
    const [x, y] = tile;
    // Rebel counter stays on the colony — mark it as occupied
    G.mapState.buildings[y][x].rebelCounter = counterSwords;
  }
};

/** Apply the win/lose effect for the specific rebellion card */
const applyOutcome = (
  G: MyGameState,
  card: string,
  targetID: string,
  defenderWins: boolean,
  counterSwords: number,
  targetTile?: [number, number],
  shuffle?: <T>(arr: T[]) => T[]
): void => {
  switch (card) {
    case "pretender_rebellion":
      resolvePretenderRebellion(G, targetID, defenderWins, shuffle!);
      break;
    case "peasant_rebellion":
      resolvePeasantRebellion(G, targetID, defenderWins);
      break;
    case "orthodox_rebellion":
      resolveOrthodoxRebellion(G, targetID, defenderWins);
      break;
    case "heretic_rebellion":
      resolveHereticRebellion(G, targetID, defenderWins);
      break;
    case "colonial_rebellion":
      resolveColonialRebellion(G, targetID, defenderWins, counterSwords, targetTile);
      break;
  }
};

/** Return counter to pool unless Colonial REBELLION where rebels won */
const returnCounter = (
  G: MyGameState,
  card: string,
  defenderWins: boolean,
  counterSwords: number
): void => {
  if (card === "colonial_rebellion" && !defenderWins) {
    // Counter stays on the colony tile — don't return to pool
    return;
  }
  G.contingentPool.push(counterSwords);
};

// Interactive rebellion helpers

/**
 * Find the next rebellion in deferredEvents, draw a contingent counter,
 * and set G.currentRebellion. Returns true if a rebellion was set up,
 * false if no rebellions remain.
 */
export const setupNextRebellion = (G: MyGameState): boolean => {
  const idx = G.eventState.deferredEvents.findIndex((e) =>
    e.card.endsWith("_rebellion")
  );
  if (idx === -1) return false;

  const event = G.eventState.deferredEvents.splice(idx, 1)[0];

  if (G.contingentPool.length === 0) {
    logEvent(G, "No contingent counters left \u2014 rebellion cannot occur");
    return false;
  }

  const counterSwords = G.contingentPool.pop()!;
  const kingdom = G.playerInfo[event.targetPlayerID].kingdomName;
  logEvent(G, `Rebellion in ${kingdom}! Rebel force: ${counterSwords} swords`);

  G.currentRebellion = { event, counterSwords };
  return true;
};

/**
 * Resolve a rebellion with the player's chosen troop commitment.
 * Called from the commitRebellionTroops move.
 */
export const resolveRebellionWithTroops = (
  G: MyGameState,
  rebellion: MyGameState["currentRebellion"] & {},
  regiments: number,
  levies: number,
  shuffle: <T>(arr: T[]) => T[]
): void => {
  const { event, counterSwords } = rebellion;
  const { card, targetPlayerID, targetTile } = event;
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  // If no troops committed, rebels auto-win
  if (regiments === 0 && levies === 0) {
    logEvent(G, `${kingdom} surrenders \u2014 rebels win automatically`);
    applyOutcome(G, card, targetPlayerID, false, counterSwords, targetTile, shuffle);
    returnCounter(G, card, false, counterSwords);
    return;
  }

  // Check for fort — colonial rebellions use the colony tile, others use Kingdom
  let fortPresent = false;
  if (card === "colonial_rebellion" && targetTile) {
    fortPresent = hasFortAt(G, targetTile[0], targetTile[1]);
  } else {
    fortPresent = hasFortAt(G, KINGDOM_LOCATION[0], KINGDOM_LOCATION[1]);
  }

  // Rebel always draws from deck; defender uses hand card if provided
  const fowRebel = drawFortuneOfWarCard(G, shuffle);
  const fowDefender = rebellion.fowCard ?? drawFortuneOfWarCard(G, shuffle);

  const { defenderWins, hitsOnDefender } = calculateBattle(
    counterSwords,
    regiments,
    levies,
    fortPresent,
    fowRebel,
    fowDefender
  );

  // Apply troop losses — remove from player's kingdom resources
  if (hitsOnDefender > 0) {
    applyTroopLosses(G, targetPlayerID, hitsOnDefender);
  }

  const defenderSwords = regiments * 2 + levies;
  const defenderShields = fortPresent ? regiments + levies : 0;

  logEvent(
    G,
    defenderWins
      ? `${kingdom} defeats the rebels!`
      : `Rebels overwhelm ${kingdom}'s defenders!`
  );

  G.battleResult = {
    battleType: "Rebellion",
    attackerName: "Rebels",
    defenderName: kingdom,
    attackerSwords: counterSwords,
    attackerShields: 0,
    defenderSwords,
    defenderShields,
    attackerFoW: fowRebel,
    defenderFoW: fowDefender,
    attackerLosses: "—",
    defenderLosses: hitsOnDefender > 0 ? `${hitsOnDefender} hits absorbed` : "none",
    winner: defenderWins ? kingdom : "Rebels",
    outcome: defenderWins ? `${kingdom} defeats the rebels!` : `Rebels overwhelm ${kingdom}!`,
  };

  applyOutcome(G, card, targetPlayerID, defenderWins, counterSwords, targetTile, shuffle);
  returnCounter(G, card, defenderWins, counterSwords);
};

/**
 * Resolve a rebellion including rival contributions from both sides.
 * Rival troops add to the defender or rebel swords totals.
 */
export const resolveRebellionWithTroopsAndRivals = (
  G: MyGameState,
  rebellion: MyGameState["currentRebellion"] & {},
  shuffle: <T>(arr: T[]) => T[]
): void => {
  const { event, counterSwords, defenderRegiments, defenderLevies, rivalContributions } = rebellion;
  const { card, targetPlayerID, targetTile } = event;
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  const defReg = defenderRegiments ?? 0;
  const defLev = defenderLevies ?? 0;

  // Sum rival contributions per side
  let rivalDefenderSwords = 0;
  let rivalRebelSwords = 0;
  for (const [, contrib] of Object.entries(rivalContributions ?? {})) {
    const swords = contrib.regiments * 2 + contrib.levies;
    if (contrib.side === "defender") rivalDefenderSwords += swords;
    else rivalRebelSwords += swords;
  }

  const totalDefenderSwords = defReg * 2 + defLev + rivalDefenderSwords;
  const totalRebelSwords = counterSwords + rivalRebelSwords;

  if (totalDefenderSwords === 0 && defReg === 0 && defLev === 0) {
    logEvent(G, `${kingdom} surrenders \u2014 rebels win automatically`);
    applyOutcome(G, card, targetPlayerID, false, counterSwords, targetTile, shuffle);
    returnCounter(G, card, false, counterSwords);
    returnRivalTroops(G, false, rivalContributions ?? {});
    return;
  }

  // Check for fort — colonial rebellions use the colony tile, others use Kingdom
  let fortPresent = false;
  if (card === "colonial_rebellion" && targetTile) {
    fortPresent = hasFortAt(G, targetTile[0], targetTile[1]);
  } else {
    fortPresent = hasFortAt(G, KINGDOM_LOCATION[0], KINGDOM_LOCATION[1]);
  }

  // Rebel always draws from deck; defender uses hand card if provided
  const fowRebel = drawFortuneOfWarCard(G, shuffle);
  const fowDefender = rebellion.fowCard ?? drawFortuneOfWarCard(G, shuffle);

  // Use combined swords for battle calculation
  const totalDefShields = fortPresent ? defReg + defLev : 0;
  const { hitsOnDefender, hitsOnAttacker: hitsOnRebel } = calculateCombat(
    { swords: totalRebelSwords, shields: 0, fowSword: fowRebel.sword, fowShield: fowRebel.shield },
    { swords: totalDefenderSwords, shields: totalDefShields, fowSword: fowDefender.sword, fowShield: fowDefender.shield },
  );

  const defenderHP = defReg * 2 + defLev + rivalDefenderSwords;
  const rebelHP = counterSwords + rivalRebelSwords;

  const rebelsEliminated = hitsOnRebel >= rebelHP;
  const defendersEliminated = hitsOnDefender >= defenderHP;
  const defenderWins = !defendersEliminated || rebelsEliminated;

  if (hitsOnDefender > 0) {
    applyTroopLosses(G, targetPlayerID, Math.min(hitsOnDefender, defReg * 2 + defLev));
  }

  logEvent(G, defenderWins
    ? `${kingdom} defeats the rebels! (${totalDefenderSwords}S vs ${totalRebelSwords}S)`
    : `Rebels overwhelm the defenders! (${totalRebelSwords}S vs ${totalDefenderSwords}S)`
  );

  G.battleResult = {
    battleType: "Rebellion",
    attackerName: "Rebels",
    defenderName: kingdom,
    attackerSwords: totalRebelSwords,
    attackerShields: 0,
    defenderSwords: totalDefenderSwords,
    defenderShields: totalDefShields,
    attackerFoW: fowRebel,
    defenderFoW: fowDefender,
    attackerLosses: "—",
    defenderLosses: hitsOnDefender > 0 ? `${hitsOnDefender} hits absorbed` : "none",
    winner: defenderWins ? kingdom : "Rebels",
    outcome: defenderWins
      ? `${kingdom} defeats the rebels!`
      : `Rebels overwhelm ${kingdom}!`,
  };

  applyOutcome(G, card, targetPlayerID, defenderWins, counterSwords, targetTile, shuffle);
  returnCounter(G, card, defenderWins, counterSwords);
  returnRivalTroops(G, defenderWins, rivalContributions ?? {});
};

/**
 * Return surviving rival troops to their kingdoms.
 * Troops on the winning side survive and return in full.
 * Troops on the losing side are lost (they were overrun).
 */
const returnRivalTroops = (
  G: MyGameState,
  defenderWins: boolean,
  rivalContributions: Record<string, { side: string; regiments: number; levies: number }>
): void => {
  const winningSide = defenderWins ? "defender" : "rebel";
  for (const [playerID, contrib] of Object.entries(rivalContributions)) {
    if (contrib.side === winningSide) {
      // Winning side — return all troops
      G.playerInfo[playerID].resources.regiments += contrib.regiments;
      G.playerInfo[playerID].resources.levies += contrib.levies;
    }
    // Losing side — troops are lost (already deducted on commit)
  }
};
