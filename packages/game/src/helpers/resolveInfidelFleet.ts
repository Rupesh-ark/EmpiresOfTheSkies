/**
 * resolveInfidelFleet.ts
 *
 * Handles the Infidel Fleet's per-round behavior during Resolve Encounters:
 * 1. Reactivate if flipped inactive
 * 2. Target the player with highest military power
 * 3. Move to that player's largest fleet's square
 * 4. Auto-resolve aerial combat against each player fleet in that square
 *
 * TODO: Replace auto-resolve with interactive aerial combat where
 * targeted players can choose to evade or fight, and FoW cards are
 * drawn interactively.
 */

import { MyGameState } from "../types";
import { logEvent } from "./stateUtils";
import { drawFortuneOfWarCard } from "./helpers";
import { INFIDEL_EMPIRE_LOCATION } from "../codifiedGameInfo";

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
  playerSkyships: number
): FleetCombatResult => {
  const playerSwords = playerSkyships; // 1 sword per skyship
  const playerShields = playerSkyships; // 1 shield per skyship

  const fowInfidel = drawFortuneOfWarCard(G);
  const fowPlayer = drawFortuneOfWarCard(G);

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
 * Resolve the Infidel Fleet's actions for this round.
 * Called at the start of Resolution, before rebellions and invasion.
 */
export const resolveInfidelFleet = (G: MyGameState): void => {
  if (!G.infidelFleet || G.infidelFleet.destroyed) return;

  // ── 1. Reactivate if flipped ──
  if (!G.infidelFleet.active) {
    G.infidelFleet.active = true;
    logEvent(G, "Infidel Fleet reactivates");
  }

  // ── 2. Target ──
  const targetID = findTarget(G);
  if (!targetID) return;

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
    return; // No combat, just piracy
  }

  // ── 4. Combat — attack each player fleet at this square (IPO order) ──
  const [fx, fy] = destination;
  const infidel = G.infidelFleet.counter;

  for (const id of G.turnOrder) {
    if (!G.infidelFleet.active) break; // Fleet was flipped/destroyed

    for (let i = 0; i < G.playerInfo[id].fleetInfo.length; i++) {
      if (!G.infidelFleet.active) break;

      const fleet = G.playerInfo[id].fleetInfo[i];
      if (
        fleet.skyships <= 0 ||
        fleet.location[0] !== fx ||
        fleet.location[1] !== fy
      ) {
        continue;
      }

      const kingdom = G.playerInfo[id].kingdomName;
      logEvent(G, `Infidel Fleet attacks ${kingdom}'s fleet (${fleet.skyships} skyships)`);

      const { infidelWins, hitsOnInfidel, hitsOnPlayer } = resolveCombat(
        G,
        infidel.swords,
        infidel.shields,
        fleet.skyships
      );

      // Apply player losses
      if (hitsOnPlayer > 0) {
        const skyshipsLost = Math.min(hitsOnPlayer, fleet.skyships);
        applyPlayerFleetLosses(G, id, i, skyshipsLost);
        logEvent(G, `${kingdom} loses ${skyshipsLost} skyship(s)`);
      }

      if (infidelWins) {
        // Infidel Fleet wins — its losses are IGNORED
        logEvent(G, "Infidel Fleet wins \u2014 its losses are ignored");
      } else {
        // Infidel Fleet loses
        if (hitsOnInfidel >= infidel.swords) {
          // Destroyed — removed from play (kept in state for tracking)
          logEvent(G, "Infidel Fleet destroyed!");
          G.infidelFleet.destroyed = true;
          G.infidelFleet.active = false;
          return;
        } else {
          // Flipped inactive — no more combat, stays for piracy
          G.infidelFleet.active = false;
          logEvent(G, "Infidel Fleet defeated but survives \u2014 flipped inactive");
        }
      }
    }
  }
};
