/**
 * resolveRebellion.ts
 *
 * Auto-resolves rebellion battles during the Resolution phase.
 *
 * TODO: Replace auto-resolution with an interactive ground battle sub-phase
 * where the defender chooses which troops to commit, rival players can
 * contribute up to 3 regiments/levies to either side, and FoW cards are
 * drawn interactively (not simulated).
 */

import { MyGameState, DeferredEvent, LegacyCardInfo } from "../types";
import {
  addVPAmount,
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  logEvent,
} from "./stateUtils";
import { drawFortuneOfWarCard } from "./helpers";
import { CARD_RESOLVERS, resolveCardWithAlignmentPenalty } from "./legacyCardDefinitions";

// ── Battle math ──────────────────────────────────────────────────────────────

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
  // Rebel attack strength
  const totalRebelSwords = rebelSwords + fowRebel.sword;
  const totalRebelShields = fowRebel.shield; // counter has 0 base shields

  // Defender attack strength
  const defenderBaseSwords = defenderRegiments * 2 + defenderLevies * 1;
  const defenderBaseShields = hasFort ? defenderRegiments + defenderLevies : 0;
  const totalDefenderSwords = defenderBaseSwords + fowDefender.sword;
  const totalDefenderShields = defenderBaseShields + fowDefender.shield;

  // Hits = swords - shields (min 0)
  const hitsOnDefender = Math.max(0, totalRebelSwords - totalDefenderShields);
  const hitsOnRebel = Math.max(0, totalDefenderSwords - totalRebelShields);

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

// ── Per-card outcome handlers ────────────────────────────────────────────────

const resolvePretenderRebellion = (
  G: MyGameState,
  targetID: string,
  defenderWins: boolean
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
    // Draw 1 new card (auto-pick best)
    if (G.cardDecks.legacyDeck.length > 0) {
      const idx = Math.floor(Math.random() * G.cardDecks.legacyDeck.length);
      player.resources.legacyCard = G.cardDecks.legacyDeck.splice(idx, 1)[0];
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

// ── Main resolver ────────────────────────────────────────────────────────────

/**
 * Process a single pending rebellion event. Draws a contingent counter,
 * simulates FoW card draws for both sides, calculates the battle, and
 * applies the per-card outcome.
 *
 * TODO: Replace with interactive ground battle sub-phase where:
 * - Defender chooses which troops to commit (currently auto-commits all)
 * - Rival players can contribute up to 3 regiments/levies to either side
 * - FoW cards are drawn interactively, not simulated
 */
export const resolveRebellionEvent = (
  G: MyGameState,
  event: DeferredEvent
): void => {
  const { card, targetPlayerID, targetTile } = event;

  // Draw contingent counter
  if (G.contingentPool.length === 0) {
    console.log("No contingent counters left — rebellion cannot occur");
    return;
  }
  const counterSwords = G.contingentPool.pop()!;
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;
  logEvent(G, `Rebellion in ${kingdom}! Rebel force: ${counterSwords} swords`);

  const player = G.playerInfo[targetPlayerID];

  // Determine defender troops (auto-commit all kingdom troops)
  const defenderRegiments = player.resources.regiments;
  const defenderLevies = player.resources.levies;

  // If no troops committed, rebels auto-win
  if (defenderRegiments === 0 && defenderLevies === 0) {
    logEvent(G, `${kingdom} has no troops \u2014 rebels win automatically`);
    applyOutcome(G, card, targetPlayerID, false, counterSwords, targetTile);
    returnCounter(G, card, false, counterSwords);
    return;
  }

  // Check for fort (at colony for Colonial, at Kingdom for others)
  let hasFort = false;
  if (card === "colonial_rebellion" && targetTile) {
    const [x, y] = targetTile;
    hasFort = G.mapState.buildings[y][x].fort;
  }
  // TODO: Check for fort at Kingdom location for other rebellions

  // Simulate FoW card draws for both sides
  const fowRebel = drawFortuneOfWarCard(G);
  const fowDefender = drawFortuneOfWarCard(G);

  const { defenderWins, hitsOnDefender } = calculateBattle(
    counterSwords,
    defenderRegiments,
    defenderLevies,
    hasFort,
    fowRebel,
    fowDefender
  );

  // Apply troop losses to defender (even if they win, they may take casualties)
  if (hitsOnDefender > 0) {
    applyTroopLosses(G, targetPlayerID, hitsOnDefender);
  }

  logEvent(G, defenderWins
    ? `${kingdom} defeats the rebels!`
    : `Rebels overwhelm ${kingdom}'s defenders!`
  );

  // Apply per-card outcome
  applyOutcome(G, card, targetPlayerID, defenderWins, counterSwords, targetTile);

  // Return counter to pool (except Colonial REBELLION loss)
  returnCounter(G, card, defenderWins, counterSwords);
};

/** Apply the win/lose effect for the specific rebellion card */
const applyOutcome = (
  G: MyGameState,
  card: string,
  targetID: string,
  defenderWins: boolean,
  counterSwords: number,
  targetTile?: [number, number]
): void => {
  switch (card) {
    case "pretender_rebellion":
      resolvePretenderRebellion(G, targetID, defenderWins);
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
