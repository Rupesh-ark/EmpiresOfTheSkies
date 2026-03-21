/**
 * resolveInfidelFleet.ts
 *
 * Handles the Infidel Fleet's per-round behavior during Resolve Encounters:
 * 1. Reactivate if flipped inactive
 * 2. Target the player with highest military power
 * 3. Move to that player's largest fleet's square
 * 4. Player chooses fight or evade (interactive via respondToInfidelFleet move)
 * 5. If fight: resolve aerial combat with optional player FoW card
 */

import { MyGameState } from "../types";
import { logEvent } from "./stateUtils";
import { drawFortuneOfWarCard } from "./helpers";
import { INFIDEL_EMPIRE_LOCATION } from "../data/gameData";

// ── Military power calculation ───────────────────────────────────────────────

/** Total military power: regiments×2 + levies×1 + skyships×1 everywhere */
const getPlayerMilitaryPower = (G: MyGameState, playerID: string): number => {
  const player = G.playerInfo[playerID];
  let power = 0;

  // Kingdom reserves
  power += player.resources.regiments * 2;
  power += player.resources.levies;
  power += player.resources.skyships;

  // Fleets
  for (const fleet of player.fleetInfo) {
    power += fleet.regiments * 2;
    power += fleet.levies;
    power += fleet.skyships;
  }

  // Garrisoned troops on map
  for (const row of G.mapState.buildings) {
    for (const tile of row) {
      if (tile.player?.id === playerID) {
        power += tile.garrisonedRegiments * 2;
        power += tile.garrisonedLevies;
      }
    }
  }

  return power;
};

// ── Targeting ────────────────────────────────────────────────────────────────

/**
 * Find the target player: highest military power.
 * Ties: alternate per round using IPO order.
 */
const findTarget = (G: MyGameState): string | null => {
  const turnOrder = G.turnOrder;
  if (turnOrder.length === 0) return null;

  let maxPower = -1;
  const candidates: string[] = [];

  for (const id of turnOrder) {
    const power = getPlayerMilitaryPower(G, id);
    if (power > maxPower) {
      maxPower = power;
      candidates.length = 0;
      candidates.push(id);
    } else if (power === maxPower) {
      candidates.push(id);
    }
  }

  if (candidates.length === 1) return candidates[0];

  // Ties: alternate by round. Pick candidate at (round % tied count) in IPO order.
  const idx = G.round % candidates.length;
  return candidates[idx];
};

// ── Movement ─────────────────────────────────────────────────────────────────

/**
 * Move the Fleet to the target player's largest fleet on the map.
 * Returns the square coordinates, or Infidel Empire if no fleet found.
 */
const findTargetFleetSquare = (
  G: MyGameState,
  targetID: string
): [number, number] => {
  let maxSkyships = 0;
  let bestLocation: [number, number] = [...INFIDEL_EMPIRE_LOCATION] as [number, number];

  for (const fleet of G.playerInfo[targetID].fleetInfo) {
    if (
      fleet.skyships > maxSkyships &&
      // Exclude fleets at Kingdom location (not "on the map")
      !(fleet.location[0] === INFIDEL_EMPIRE_LOCATION[0] && fleet.location[1] === INFIDEL_EMPIRE_LOCATION[1])
    ) {
      maxSkyships = fleet.skyships;
      bestLocation = [fleet.location[0], fleet.location[1]];
    }
  }

  return bestLocation;
};

// ── Aerial combat ────────────────────────────────────────────────────────────

type FleetCombatResult = {
  /** true if Infidel Fleet won or drew */
  infidelWins: boolean;
  /** hits landed on the Infidel Fleet */
  hitsOnInfidel: number;
  /** hits landed on the player fleet */
  hitsOnPlayer: number;
};

/**
 * Auto-resolve aerial combat between the Infidel Fleet and a player fleet.
 * Infidel Fleet: 15S/5Sh + FoW
 * Player fleet: skyships × (1S + 1Sh) + FoW
 */
const resolveCombat = (
  G: MyGameState,
  infidelSwords: number,
  infidelShields: number,
  playerSkyships: number,
  shuffle: <T>(arr: T[]) => T[],
  playerFoWCard?: { sword: number; shield: number }
): FleetCombatResult => {
  const playerSwords = playerSkyships; // 1 sword per skyship
  const playerShields = playerSkyships; // 1 shield per skyship

  const fowInfidel = drawFortuneOfWarCard(G, shuffle);
  // Use player's hand card if provided, otherwise draw from deck
  const fowPlayer = playerFoWCard ?? drawFortuneOfWarCard(G, shuffle);

  const totalInfidelSwords = infidelSwords + fowInfidel.sword;
  const totalInfidelShields = infidelShields + fowInfidel.shield;
  const totalPlayerSwords = playerSwords + fowPlayer.sword;
  const totalPlayerShields = playerShields + fowPlayer.shield;

  const hitsOnPlayer = Math.max(0, totalInfidelSwords - totalPlayerShields);
  const hitsOnInfidel = Math.max(0, totalPlayerSwords - totalInfidelShields);

  // Player fleet HP = skyships (each takes 1 hit to destroy)
  // Infidel Fleet HP = its swords value
  const playerDestroyed = hitsOnPlayer >= playerSkyships;
  const infidelDestroyed = hitsOnInfidel >= infidelSwords;

  // Defender (player) wins ties
  const infidelWins = playerDestroyed && !infidelDestroyed;

  return { infidelWins, hitsOnInfidel, hitsOnPlayer };
};

/**
 * Apply combat results to the player's fleet.
 * Skyships destroyed; troops aboard destroyed skyships are lost.
 */
const applyPlayerFleetLosses = (
  G: MyGameState,
  playerID: string,
  fleetIdx: number,
  skyshipsLost: number
): void => {
  const fleet = G.playerInfo[playerID].fleetInfo[fleetIdx];
  const actualLost = Math.min(skyshipsLost, fleet.skyships);
  fleet.skyships -= actualLost;

  // Troops aboard destroyed skyships are lost (1 troop per skyship)
  let troopsToLose = actualLost;
  const regLost = Math.min(troopsToLose, fleet.regiments);
  fleet.regiments -= regLost;
  troopsToLose -= regLost;
  const levyLost = Math.min(troopsToLose, fleet.levies);
  fleet.levies -= levyLost;
};

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Prepare the Infidel Fleet for combat: reactivate, target, move.
 * Returns true if there's a player fleet to fight (sets infidelFleetCombat).
 * Returns false if no combat needed (no fleet, stays at empire for piracy).
 */
export const prepareInfidelFleetCombat = (G: MyGameState): boolean => {
  if (!G.infidelFleet || G.infidelFleet.destroyed) return false;

  // ── 1. Reactivate if flipped ──
  if (!G.infidelFleet.active) {
    G.infidelFleet.active = true;
    logEvent(G, "Infidel Fleet reactivates");
  }

  // ── 2. Target ──
  const targetID = findTarget(G);
  if (!targetID) return false;

  const targetKingdom = G.playerInfo[targetID].kingdomName;
  logEvent(G, `Infidel Fleet targets ${targetKingdom} (highest military power)`);

  // ── 3. Move ──
  const destination = findTargetFleetSquare(G, targetID);
  G.infidelFleet.location = destination;

  const atEmpire =
    destination[0] === INFIDEL_EMPIRE_LOCATION[0] &&
    destination[1] === INFIDEL_EMPIRE_LOCATION[1];

  if (atEmpire) {
    logEvent(G, `${targetKingdom} has no fleets on the map \u2014 Infidel Fleet remains at Infidel Empire`);
    return false;
  }

  // Find the target's largest fleet at this square
  const [fx, fy] = destination;
  let bestFleetIdx = -1;
  let bestSkyships = 0;
  for (let i = 0; i < G.playerInfo[targetID].fleetInfo.length; i++) {
    const fleet = G.playerInfo[targetID].fleetInfo[i];
    if (
      fleet.skyships > bestSkyships &&
      fleet.location[0] === fx &&
      fleet.location[1] === fy
    ) {
      bestSkyships = fleet.skyships;
      bestFleetIdx = i;
    }
  }

  if (bestFleetIdx === -1) return false;

  G.infidelFleetCombat = { targetPlayerID: targetID, fleetIndex: bestFleetIdx };
  return true;
};

/**
 * Execute aerial combat between the Infidel Fleet and a player fleet.
 * Called from the respondToInfidelFleet move when the player chooses "fight".
 *
 * @param fowCard Optional FoW card from the player's hand
 */
export const executeInfidelFleetCombat = (
  G: MyGameState,
  shuffle: <T>(arr: T[]) => T[],
  fowCard?: { sword: number; shield: number }
): void => {
  const combat = G.infidelFleetCombat;
  if (!combat || !G.infidelFleet) return;

  const { targetPlayerID, fleetIndex } = combat;
  const fleet = G.playerInfo[targetPlayerID].fleetInfo[fleetIndex];
  const infidel = G.infidelFleet.counter;
  const kingdom = G.playerInfo[targetPlayerID].kingdomName;

  logEvent(G, `${kingdom}'s fleet fights the Infidel Fleet (${fleet.skyships} skyships vs ${infidel.swords}S/${infidel.shields}Sh)`);

  const { infidelWins, hitsOnInfidel, hitsOnPlayer } = resolveCombat(
    G,
    infidel.swords,
    infidel.shields,
    fleet.skyships,
    shuffle,
    fowCard
  );

  if (hitsOnPlayer > 0) {
    const skyshipsLost = Math.min(hitsOnPlayer, fleet.skyships);
    applyPlayerFleetLosses(G, targetPlayerID, fleetIndex, skyshipsLost);
    logEvent(G, `${kingdom} loses ${skyshipsLost} skyship(s)`);
  }

  if (infidelWins) {
    logEvent(G, "Infidel Fleet wins \u2014 its losses are ignored");
  } else {
    if (hitsOnInfidel >= infidel.swords) {
      logEvent(G, "Infidel Fleet destroyed!");
      G.infidelFleet.destroyed = true;
      G.infidelFleet.active = false;
    } else {
      G.infidelFleet.active = false;
      logEvent(G, "Infidel Fleet defeated but survives \u2014 flipped inactive");
    }
  }

  G.infidelFleetCombat = null;
};
