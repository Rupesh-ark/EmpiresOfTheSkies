import { MyGameState, MapBuildingOwner, PlayerInfo } from "../types";
import { MAX_SKYSHIPS, MAX_REGIMENTS, HERESY_MAX, HERESY_MIN } from "../data/gameData";
import { getRepublicInfluence } from "./republicUtils";

export { HERESY_MAX, HERESY_MIN };

/** Slim ownership stamp for map cells — never store the full PlayerInfo there. */
export const toBuildingOwner = (p: PlayerInfo): MapBuildingOwner => ({
  id: p.id,
  colour: p.colour,
  kingdomName: p.kingdomName,
});

function sanitizeValue(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || isNaN(val)) return fallback;
  return val;
}

// New counsellor/action system — counsellors = max actions per round
// Actions taken are tracked separately and reset each round

export const incrementActionsTaken = (G: MyGameState, playerID: string) => {
  G.playerInfo[playerID].actionsTakenThisRound += 1;
};

export const assertHasActionsAvailable = (G: MyGameState, playerID: string): boolean => {
  return G.playerInfo[playerID].actionsTakenThisRound < G.playerInfo[playerID].resources.counsellors;
};

export const recruitCounsellor = (G: MyGameState, playerID: string) => {
  G.playerInfo[playerID].resources.counsellors += 1;
};

export const spendCounsellor = (G: MyGameState, playerID: string) => {
  G.playerInfo[playerID].resources.counsellors -= 1;
};
export const removeVPAmount = (
  G: MyGameState,
  playerID: string,
  vpAmount: number
) => {
  const sanitizedVP = sanitizeValue(G.playerInfo[playerID].resources.victoryPoints);
  const sanitizedAmount = sanitizeValue(vpAmount, 0);
  G.playerInfo[playerID].resources.victoryPoints = Math.max(
    0,
    sanitizedVP - sanitizedAmount
  );
};

export const addVPAmount = (
  G: MyGameState,
  playerID: string,
  vpAmount: number
) => {
  const sanitizedVP = sanitizeValue(G.playerInfo[playerID].resources.victoryPoints);
  const sanitizedAmount = sanitizeValue(vpAmount, 0);
  G.playerInfo[playerID].resources.victoryPoints = sanitizedVP + sanitizedAmount;
};

export const removeGoldAmount = (
  G: MyGameState,
  playerID: string,
  goldAmount: number
) => {
  G.playerInfo[playerID].resources.gold -= goldAmount;
};

export const addGoldAmount = (
  G: MyGameState,
  playerID: string,
  goldAmount: number
) => {
  G.playerInfo[playerID].resources.gold += goldAmount;
};

export const removeSkyship = (G: MyGameState, playerID: string) => {
  G.playerInfo[playerID].resources.skyships -= 1;
};

/** Count all skyships a player has placed as route markers on the map. */
export const countRouteSkyships = (G: MyGameState, playerID: string): number =>
  Object.values(G.mapState.routeSkyships)
    .filter(players => players.includes(playerID)).length;

export const addSkyship = (G: MyGameState, playerID: string) => {
  const player = G.playerInfo[playerID];
  const totalSkyships = player.resources.skyships +
    player.fleetInfo.reduce((sum, f) => sum + f.skyships, 0) +
    countRouteSkyships(G, playerID);
  if (totalSkyships < MAX_SKYSHIPS) {
    player.resources.skyships += 1;
  }
};

export const addRegiments = (
  G: MyGameState,
  playerID: string,
  amount: number
) => {
  const player = G.playerInfo[playerID];
  const totalRegiments = player.resources.regiments +
    player.fleetInfo.reduce((sum, f) => sum + f.regiments, 0) +
    G.mapState.buildings.reduce((sum, row) =>
      sum + row.reduce((s, cell) =>
        s + (cell.player?.id === playerID ? cell.garrisonedRegiments : 0), 0), 0);
  const allowed = Math.min(amount, MAX_REGIMENTS - totalRegiments);
  if (allowed > 0) {
    player.resources.regiments += allowed;
  }
};

export const increaseHeresyWithinMove = (G: MyGameState, playerID: string) => {
  // Track has 19 spaces: internal range HERESY_MIN (most orthodox) to HERESY_MAX (most heretic)
  if (G.playerInfo[playerID].heresyTracker < HERESY_MAX) {
    G.playerInfo[playerID].heresyTracker += 1;
  }
};

export const increaseOrthodoxyWithinMove = (
  G: MyGameState,
  playerID: string
) => {
  if (G.playerInfo[playerID].heresyTracker > HERESY_MIN) {
    G.playerInfo[playerID].heresyTracker -= 1;
  }
};

export const addLevyAmount = (
  G: MyGameState,
  playerID: string,
  levyAmount: number
) => {
  const sanitized = sanitizeValue(levyAmount, 0);
  const currentLevies = sanitizeValue(G.playerInfo[playerID].resources.levies);
  G.playerInfo[playerID].resources.levies = currentLevies + sanitized;
};

export const removeLevyAmount = (
  G: MyGameState,
  playerID: string,
  levyAmount: number
) => {
  const sanitized = sanitizeValue(levyAmount, 0);
  const currentLevies = sanitizeValue(G.playerInfo[playerID].resources.levies);
  G.playerInfo[playerID].resources.levies = Math.max(0, currentLevies - sanitized);
};

export { sanitizeValue };

/** Return elite regiments to a kingdom's reserve. No max cap — they are non-recruitable,
 *  so the pool can only shrink over a game; we never need to clamp here. */
export const addEliteRegiments = (
  G: MyGameState,
  playerID: string,
  amount: number
) => {
  G.playerInfo[playerID].resources.eliteRegiments += amount;
};

const MAX_LOG_ENTRIES = 200;

export const logEvent = (G: MyGameState, message: string) => {
  G.gameLog.push({ round: G.round, message });
  if (G.gameLog.length > MAX_LOG_ENTRIES) {
    G.gameLog.splice(0, G.gameLog.length - MAX_LOG_ENTRIES);
  }
};

export const allPlayersPassed = (G: MyGameState): boolean =>
  Object.values(G.playerInfo).every((p) => p.passed);

export function nextUnpassedPlayer(G: MyGameState, currentID: string): string | null {
  const idx = G.turnOrder.indexOf(currentID);
  for (let i = 1; i <= G.turnOrder.length; i++) {
    const nextID = G.turnOrder[(idx + i) % G.turnOrder.length];
    if (!G.playerInfo[nextID].passed) return nextID;
  }
  return null;
}

export const advanceAllHeresyTrackers = (G: MyGameState, steps = 1) => {
  for (let i = 0; i < steps; i++) {
    Object.values(G.playerInfo).forEach((player) => {
      increaseHeresyWithinMove(G, player.id);
    });
  }
};
export const retreatAllHeresyTrackers = (G: MyGameState, steps = 1) => {
  for (let i = 0; i < steps; i++) {
    Object.values(G.playerInfo).forEach((player) => {
      increaseOrthodoxyWithinMove(G, player.id);
    });
  }
};

export const calculateMercy = (G: MyGameState) => {
  // Reset each round before recalculating — previous values remain readable until this runs
  G.mercyGold = {};

  // 1. Find leader VP
  const allVPs = Object.values(G.playerInfo).map(p => p.resources.victoryPoints);
  const leaderVP = Math.max(...allVPs);

  // 2. For each player, calculate mercy
  for (const [playerID, player] of Object.entries(G.playerInfo)) {
    const gap = leaderVP - player.resources.victoryPoints;
    const baseMercy = Math.floor(gap / 3);
    if (baseMercy <= 0) continue;

    // 3. Count supporting republics using shared helper
    const republics = getRepublicInfluence(G, playerID);
    let supporting = 0;
    if (republics.zeeland.supporting) supporting++;
    if (republics.venoa.supporting) supporting++;

    // 4. Apply multiplier
    let mercyGold = 0;
    if (supporting === 2) {
      mercyGold = baseMercy;
    } else if (supporting === 1) {
      mercyGold = Math.floor(baseMercy * 0.5);
    }
    // supporting === 0: no mercy

    // 5. Add gold, record for UI, and log
    if (mercyGold > 0) {
      addGoldAmount(G, playerID, mercyGold);
      G.mercyGold[playerID] = mercyGold;
      const backers = supporting === 2 ? "both Republics" : republics.zeeland.supporting ? "Zeeland" : "Venoa";
      logEvent(G, `${player.kingdomName} receives ${mercyGold} Gold — Mercy of the Republics (catch-up aid for trailing the VP leader by ${gap}, backed by ${backers})`);
    }
  }
};

/**
 * Validates that an outpost/colony transfer from ownerID to targetID at
 * tileCoords is legal. Returns undefined if valid, or an error string if not.
 */
export const validateOutpostTransfer = (
  G: MyGameState,
  ownerID: string,
  targetID: string,
  tileCoords: [number, number]
): string | undefined => {
  const [x, y] = tileCoords;

  if (!G.mapState.buildings[y] || !G.mapState.buildings[y][x]) {
    return "Invalid tile coordinates";
  }

  const cell = G.mapState.buildings[y][x];

  if (
    !cell.player ||
    cell.player.id !== ownerID ||
    (cell.buildings !== "outpost" && cell.buildings !== "colony")
  ) {
    return "Player does not own an outpost or colony at this tile";
  }

  const targetHasFleet = G.playerInfo[targetID].fleetInfo.some(
    (fleet) => fleet.location[0] === x && fleet.location[1] === y && fleet.skyships > 0
  );

  if (!targetHasFleet) {
    return "Target player does not have a fleet at this tile";
  }

  return undefined;
};