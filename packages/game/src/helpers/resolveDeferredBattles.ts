/**
 * resolveDeferredBattles.ts
 *
 * Resolves deferred battle events that are NOT rebellions:
 * - Faerie Uprising: Land attacks colony with 2× printed swords
 * - Headstrong Commander: forced conquest attempt on weakest outpost
 * - Infidels Invade Faerie: Host counter attacks a colony/outpost
 *
 * Interactive version: player chooses FoW card from hand via
 * commitDeferredBattleCard move. Attacker always draws from deck.
 */

import { MyGameState, DeferredEvent } from "../types";
import { addVPAmount, logEvent } from "./stateUtils";
import { drawFortuneOfWarCard, hasFortAt } from "./helpers";

// ── Faerie Uprising ─────────────────────────────────────────────────────────

const resolveFaerieUprising = (
  G: MyGameState,
  event: DeferredEvent,
  fowCard?: { sword: number; shield: number }
): void => {
  const { targetPlayerID, targetTile } = event;
  if (!targetTile) return;

  const [x, y] = targetTile;
  const land = G.mapState.currentTileArray[y][x];
  const landSwords = land.sword * 2;
  const landShields = land.shield;
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  logEvent(G, `Faerie Uprising at ${land.name}! Land attacks ${kingdom}'s colony with ${landSwords} swords`);

  const tile = G.mapState.buildings[y][x];
  const defRegiments = tile.garrisonedRegiments;
  const defLevies = tile.garrisonedLevies;
  const defSwords = defRegiments * 2 + defLevies;
  const defShields = hasFortAt(G, x, y) ? defRegiments + defLevies : 0;

  const fowLand = drawFortuneOfWarCard(G);
  const fowDefender = fowCard ?? drawFortuneOfWarCard(G);

  const hitsOnDefender = Math.max(0, landSwords + fowLand.sword - defShields - fowDefender.shield);
  const hitsOnLand = Math.max(0, defSwords + fowDefender.sword - landShields - fowLand.shield);

  const defenderHP = defRegiments * 2 + defLevies;
  const landHP = landSwords;

  const defenderWins = hitsOnLand >= landHP || hitsOnDefender < defenderHP;

  if (defenderWins) {
    addVPAmount(G, targetPlayerID, 1);
    logEvent(G, `${kingdom} defends the colony! +1 VP`);
  } else {
    tile.buildings = undefined;
    tile.player = undefined;
    tile.fort = false;
    tile.garrisonedRegiments = 0;
    tile.garrisonedLevies = 0;
    logEvent(G, `${kingdom} loses the colony at ${land.name}!`);
  }
};

// ── Headstrong Commander ────────────────────────────────────────────────────

const resolveHeadstrongCommander = (
  G: MyGameState,
  event: DeferredEvent,
  fowCard?: { sword: number; shield: number }
): void => {
  const { targetPlayerID, targetTile } = event;
  if (!targetTile) return;

  const [x, y] = targetTile;
  const land = G.mapState.currentTileArray[y][x];
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  logEvent(G, `Headstrong Commander! ${kingdom}'s outpost at ${land.name} attempts conquest`);

  const tile = G.mapState.buildings[y][x];
  const atkRegiments = tile.garrisonedRegiments;
  const atkLevies = tile.garrisonedLevies;
  const atkSwords = atkRegiments * 2 + atkLevies;

  const landSwords = land.sword;
  const landShields = land.shield;

  // Headstrong Commander: player's FoW card helps the attacker (their own troops)
  const fowAttacker = fowCard ?? drawFortuneOfWarCard(G);
  const fowLand = drawFortuneOfWarCard(G);

  const hitsOnLand = Math.max(0, atkSwords + fowAttacker.sword - landShields - fowLand.shield);
  const hitsOnAttacker = Math.max(0, landSwords + fowLand.sword - fowAttacker.shield);

  const landHP = landSwords;
  const attackerHP = atkRegiments * 2 + atkLevies;

  const conquestSuccess = hitsOnLand >= landHP;
  const attackerSurvives = hitsOnAttacker < attackerHP;

  if (conquestSuccess && attackerSurvives) {
    tile.buildings = "colony";
    addVPAmount(G, targetPlayerID, 1);
    logEvent(G, `Conquest succeeds! ${kingdom} gains a colony at ${land.name} (+1 VP)`);
  } else {
    tile.buildings = undefined;
    tile.player = undefined;
    tile.fort = false;
    tile.garrisonedRegiments = 0;
    tile.garrisonedLevies = 0;
    logEvent(G, `Conquest fails! ${kingdom} loses the outpost at ${land.name}`);
  }
};

// ── Infidels Invade Faerie ──────────────────────────────────────────────────

const resolveInfidelsInvadeFaerie = (
  G: MyGameState,
  event: DeferredEvent,
  fowCard?: { sword: number; shield: number }
): void => {
  const { targetPlayerID, targetTile } = event;
  if (!targetTile) return;

  if (G.infidelHostPool.length === 0) {
    logEvent(G, "No Infidel Host counters available for invasion");
    return;
  }

  const [x, y] = targetTile;
  const land = G.mapState.currentTileArray[y][x];
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  const host = G.infidelHostPool.pop()!;
  logEvent(G, `Infidels attack ${kingdom}'s ${G.mapState.buildings[y][x].buildings} at ${land.name}! Host: ${host.swords} swords`);

  const tile = G.mapState.buildings[y][x];
  const defRegiments = tile.garrisonedRegiments;
  const defLevies = tile.garrisonedLevies;
  const defSwords = defRegiments * 2 + defLevies;
  const defShields = hasFortAt(G, x, y) ? defRegiments + defLevies : 0;

  const fowHost = drawFortuneOfWarCard(G);
  const fowDefender = fowCard ?? drawFortuneOfWarCard(G);

  const hitsOnDefender = Math.max(0, host.swords + fowHost.sword - defShields - fowDefender.shield);
  const hitsOnHost = Math.max(0, defSwords + fowDefender.sword - host.shields - fowHost.shield);

  const defenderHP = defRegiments * 2 + defLevies;
  const defenderWins = hitsOnHost >= host.swords || hitsOnDefender < defenderHP;

  if (defenderWins) {
    addVPAmount(G, targetPlayerID, 1);
    G.infidelHostPool.push(host);
    logEvent(G, `${kingdom} repels the Infidels! +1 VP`);
  } else {
    tile.rebelCounter = host.swords;
    logEvent(G, `Infidels seize ${kingdom}'s ${tile.buildings} at ${land.name}! Trade gains lost`);
  }
};

// ── Dispatchers ─────────────────────────────────────────────────────────────

/**
 * Resolve a deferred battle with an optional player FoW card.
 * Called from commitDeferredBattleCard move after player makes their choice.
 */
export const resolveDeferredBattleInteractive = (
  G: MyGameState,
  event: DeferredEvent,
  fowCard?: { sword: number; shield: number }
): void => {
  switch (event.card) {
    case "faerie_uprising":
      resolveFaerieUprising(G, event, fowCard);
      break;
    case "headstrong_commander":
      resolveHeadstrongCommander(G, event, fowCard);
      break;
    case "infidels_invade_faerie":
      resolveInfidelsInvadeFaerie(G, event, fowCard);
      break;
  }
};

/**
 * Legacy auto-resolve (no player input). Still used as fallback.
 */
export const resolveDeferredBattle = (
  G: MyGameState,
  event: DeferredEvent
): void => {
  resolveDeferredBattleInteractive(G, event);
};

/**
 * Get a human-readable description of a deferred battle for the UI.
 */
export const getDeferredBattleDescription = (
  G: MyGameState,
  event: DeferredEvent
): string => {
  const { targetTile } = event;
  if (!targetTile) return "Unknown battle";
  const [x, y] = targetTile;
  const land = G.mapState.currentTileArray[y]?.[x];
  const landName = land?.name ?? "unknown land";
  const kingdom = G.playerInfo[event.targetPlayerID]?.kingdomName ?? "Unknown";

  switch (event.card) {
    case "faerie_uprising":
      return `Faerie Uprising at ${landName}! The land attacks ${kingdom}'s colony with ${(land?.sword ?? 0) * 2} swords.`;
    case "headstrong_commander":
      return `Headstrong Commander! ${kingdom}'s garrison at ${landName} attempts conquest against the land.`;
    case "infidels_invade_faerie":
      return `Infidels Invade! A Host counter attacks ${kingdom}'s settlement at ${landName}.`;
    default:
      return `Battle at ${landName}`;
  }
};
