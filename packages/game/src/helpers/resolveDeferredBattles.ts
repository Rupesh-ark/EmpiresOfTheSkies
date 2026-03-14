/**
 * resolveDeferredBattles.ts
 *
 * Auto-resolves deferred battle events that are NOT rebellions:
 * - Faerie Uprising: Land attacks colony with 2× printed swords
 * - Headstrong Commander: forced conquest attempt on weakest outpost
 * - Infidels Invade Faerie: Host counter attacks a colony/outpost
 *
 * TODO: Replace auto-resolution with interactive conquest/battle sub-phases
 * where the defender chooses troops, FoW cards are drawn interactively,
 * and the full battle UI is shown.
 */

import { MyGameState, DeferredEvent } from "../types";
import { addVPAmount, logEvent } from "./stateUtils";
import { drawFortuneOfWarCard, hasFortAt } from "./helpers";

/**
 * Auto-resolve Faerie Uprising.
 * The Land attacks with 2× its printed Sword value.
 * Player wins: keep colony, +1 VP.
 * Player loses: colony removed (as failed conquest).
 */
const resolveFaerieUprising = (G: MyGameState, event: DeferredEvent): void => {
  const { targetPlayerID, targetTile } = event;
  if (!targetTile) return;

  const [x, y] = targetTile;
  const land = G.mapState.currentTileArray[y][x];
  const landSwords = land.sword * 2;
  const landShields = land.shield;
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  logEvent(G, `Faerie Uprising at ${land.name}! Land attacks ${kingdom}'s colony with ${landSwords} swords`);

  // Defender: garrisoned troops + kingdom troops if available
  const tile = G.mapState.buildings[y][x];
  const defRegiments = tile.garrisonedRegiments;
  const defLevies = tile.garrisonedLevies;
  const defSwords = defRegiments * 2 + defLevies;
  const defShields = hasFortAt(G, x, y) ? defRegiments + defLevies : 0;

  // Simulated FoW draws
  const fowLand = drawFortuneOfWarCard(G);
  const fowDefender = drawFortuneOfWarCard(G);

  const hitsOnDefender = Math.max(0, landSwords + fowLand.sword - defShields - fowDefender.shield);
  const hitsOnLand = Math.max(0, defSwords + fowDefender.sword - landShields - fowLand.shield);

  const defenderHP = defRegiments * 2 + defLevies;
  const landHP = landSwords; // land absorbs hits equal to its attack strength

  const defenderWins = hitsOnLand >= landHP || hitsOnDefender < defenderHP;

  if (defenderWins) {
    addVPAmount(G, targetPlayerID, 1);
    logEvent(G, `${kingdom} defends the colony! +1 VP`);
  } else {
    // Colony lost — as failed conquest (remove colony, outpost, fort)
    tile.buildings = undefined;
    tile.player = undefined;
    tile.fort = false;
    tile.garrisonedRegiments = 0;
    tile.garrisonedLevies = 0;
    logEvent(G, `${kingdom} loses the colony at ${land.name}!`);
  }
};

/**
 * Auto-resolve Headstrong Commander.
 * Forces a conquest attempt on the weakest outpost with troops.
 * Uses standard conquest battle rules.
 */
const resolveHeadstrongCommander = (G: MyGameState, event: DeferredEvent): void => {
  const { targetPlayerID, targetTile } = event;
  if (!targetTile) return;

  const [x, y] = targetTile;
  const land = G.mapState.currentTileArray[y][x];
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  logEvent(G, `Headstrong Commander! ${kingdom}'s outpost at ${land.name} attempts conquest`);

  // Attacker: garrisoned troops at the outpost
  const tile = G.mapState.buildings[y][x];
  const atkRegiments = tile.garrisonedRegiments;
  const atkLevies = tile.garrisonedLevies;
  const atkSwords = atkRegiments * 2 + atkLevies;

  // Defender: the Land's printed values
  const landSwords = land.sword;
  const landShields = land.shield;

  // Simulated FoW draws
  const fowAttacker = drawFortuneOfWarCard(G);
  const fowLand = drawFortuneOfWarCard(G);

  const hitsOnLand = Math.max(0, atkSwords + fowAttacker.sword - landShields - fowLand.shield);
  const hitsOnAttacker = Math.max(0, landSwords + fowLand.sword - fowAttacker.shield);

  const landHP = landSwords;
  const attackerHP = atkRegiments * 2 + atkLevies;

  const conquestSuccess = hitsOnLand >= landHP;
  const attackerSurvives = hitsOnAttacker < attackerHP;

  if (conquestSuccess && attackerSurvives) {
    // Conquest succeeds — upgrade outpost to colony
    tile.buildings = "colony";
    addVPAmount(G, targetPlayerID, 1);
    logEvent(G, `Conquest succeeds! ${kingdom} gains a colony at ${land.name} (+1 VP)`);
  } else {
    // Conquest fails — outpost and fort lost, excess troops lost
    tile.buildings = undefined;
    tile.player = undefined;
    tile.fort = false;
    tile.garrisonedRegiments = 0;
    tile.garrisonedLevies = 0;
    logEvent(G, `Conquest fails! ${kingdom} loses the outpost at ${land.name}`);
  }
};

/**
 * Auto-resolve Infidels Invade Faerie.
 * A random Host counter attacks a colony/outpost.
 * Owner wins: +1 VP, Host back to pool.
 * Infidels win: Host stays, trade gains lost.
 */
const resolveInfidelsInvadeFaerie = (G: MyGameState, event: DeferredEvent): void => {
  const { targetPlayerID, targetTile } = event;
  if (!targetTile) return;

  if (G.infidelHostPool.length === 0) {
    logEvent(G, "No Infidel Host counters available for invasion");
    return;
  }

  const [x, y] = targetTile;
  const land = G.mapState.currentTileArray[y][x];
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  // Draw a random Host counter
  const host = G.infidelHostPool.pop()!;
  logEvent(G, `Infidels attack ${kingdom}'s ${G.mapState.buildings[y][x].buildings} at ${land.name}! Host: ${host.swords} swords`);

  // Defender: garrisoned troops
  const tile = G.mapState.buildings[y][x];
  const defRegiments = tile.garrisonedRegiments;
  const defLevies = tile.garrisonedLevies;
  const defSwords = defRegiments * 2 + defLevies;
  const defShields = hasFortAt(G, x, y) ? defRegiments + defLevies : 0;

  // Simulated FoW draws
  const fowHost = drawFortuneOfWarCard(G);
  const fowDefender = drawFortuneOfWarCard(G);

  const hitsOnDefender = Math.max(0, host.swords + fowHost.sword - defShields - fowDefender.shield);
  const hitsOnHost = Math.max(0, defSwords + fowDefender.sword - host.shields - fowHost.shield);

  const defenderHP = defRegiments * 2 + defLevies;
  const defenderWins = hitsOnHost >= host.swords || hitsOnDefender < defenderHP;

  if (defenderWins) {
    addVPAmount(G, targetPlayerID, 1);
    G.infidelHostPool.push(host); // Host back to pool
    logEvent(G, `${kingdom} repels the Infidels! +1 VP`);
  } else {
    // Host stays on the tile — trade gains lost
    // Mark tile as occupied by infidels (similar to rebel counter)
    tile.rebelCounter = host.swords; // reuse field for infidel occupation
    logEvent(G, `Infidels seize ${kingdom}'s ${tile.buildings} at ${land.name}! Trade gains lost`);
  }
};

// ── Main dispatcher ──────────────────────────────────────────────────────────

/**
 * Resolve a non-rebellion deferred battle event.
 *
 * TODO: Replace with interactive conquest/battle sub-phases.
 */
export const resolveDeferredBattle = (
  G: MyGameState,
  event: DeferredEvent
): void => {
  switch (event.card) {
    case "faerie_uprising":
      resolveFaerieUprising(G, event);
      break;
    case "headstrong_commander":
      resolveHeadstrongCommander(G, event);
      break;
    case "infidels_invade_faerie":
      resolveInfidelsInvadeFaerie(G, event);
      break;
  }
};
