import { MyGameState } from "../types";
import { MAX_SKYSHIPS, MAX_REGIMENTS, HERESY_MAX, HERESY_MIN } from "../codifiedGameInfo";

export { HERESY_MAX, HERESY_MIN };

export const removeOneCounsellor = (G: MyGameState, playerID: string) => {
  G.playerInfo[playerID].resources.counsellors -= 1;
};
export const addOneCounsellor = (G: MyGameState, playerID: string) => {
  G.playerInfo[playerID].resources.counsellors += 1;
};
export const removeVPAmount = (
  G: MyGameState,
  playerID: string,
  vpAmount: number
) => {
  // GAP-16: "A player's total of Victory Points can never fall below zero"
  G.playerInfo[playerID].resources.victoryPoints = Math.max(
    0,
    G.playerInfo[playerID].resources.victoryPoints - vpAmount
  );
};

export const addVPAmount = (
  G: MyGameState,
  playerID: string,
  vpAmount: number
) => {
  G.playerInfo[playerID].resources.victoryPoints += vpAmount;
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
export const addSkyship = (G: MyGameState, playerID: string) => {
  // GAP-13: max MAX_SKYSHIPS skyships total (reserve + deployed in fleets)
  const player = G.playerInfo[playerID];
  const totalSkyships = player.resources.skyships +
    player.fleetInfo.reduce((sum, f) => sum + f.skyships, 0);
  if (totalSkyships < MAX_SKYSHIPS) {
    player.resources.skyships += 1;
  }
};

export const addRegiments = (
  G: MyGameState,
  playerID: string,
  amount: number
) => {
  // GAP-13: max MAX_REGIMENTS regiments total (reserve + fleets + garrisoned on map)
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
  G.playerInfo[playerID].resources.levies += levyAmount;
};

/** Return elite regiments to a kingdom's reserve. No max cap — they are non-recruitable,
 *  so the pool can only shrink over a game; we never need to clamp here. */
export const addEliteRegiments = (
  G: MyGameState,
  playerID: string,
  amount: number
) => {
  G.playerInfo[playerID].resources.eliteRegiments += amount;
};

export const logEvent = (G: MyGameState, message: string) => {
  G.gameLog.push({ round: G.round, message });
};

export const advanceAllHeresyTrackers = (G: MyGameState) => {
  Object.values(G.playerInfo).forEach((player) => {
    increaseHeresyWithinMove(G, player.id);
  });
};
export const retreatAllHeresyTrackers = (G: MyGameState) => {
  Object.values(G.playerInfo).forEach((player) => {
    increaseOrthodoxyWithinMove(G, player.id);
  });
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