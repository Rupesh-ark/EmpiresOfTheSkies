import { MyGameState } from "../types";

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
  G.playerInfo[playerID].resources.victoryPoints -= vpAmount;
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
  // GAP-13: max 24 skyships total (reserve + deployed in fleets)
  const player = G.playerInfo[playerID];
  const totalSkyships = player.resources.skyships +
    player.fleetInfo.reduce((sum, f) => sum + f.skyships, 0);
  if (totalSkyships < 24) {
    player.resources.skyships += 1;
  }
};

export const removeRegiments = (
  G: MyGameState,
  playerID: string,
  amount: number
) => {
  G.playerInfo[playerID].resources.regiments -= amount;
};

export const addRegiments = (
  G: MyGameState,
  playerID: string,
  amount: number
) => {
  // GAP-13: max 30 regiments total (reserve + fleets + garrisoned on map)
  const player = G.playerInfo[playerID];
  const totalRegiments = player.resources.regiments +
    player.fleetInfo.reduce((sum, f) => sum + f.regiments, 0) +
    G.mapState.buildings.reduce((sum, row) =>
      sum + row.reduce((s, cell) =>
        s + (cell.player?.id === playerID ? cell.garrisonedRegiments : 0), 0), 0);
  const allowed = Math.min(amount, 30 - totalRegiments);
  if (allowed > 0) {
    player.resources.regiments += allowed;
  }
};

export const increaseHeresyWithinMove = (G: MyGameState, playerID: string) => {
  // Track has 19 spaces: internal range -9 (most orthodox) to +9 (most heretic)
  if (G.playerInfo[playerID].heresyTracker < 9) {
    G.playerInfo[playerID].heresyTracker += 1;
  }
};

export const increaseOrthodoxyWithinMove = (
  G: MyGameState,
  playerID: string
) => {
  if (G.playerInfo[playerID].heresyTracker > -9) {
    G.playerInfo[playerID].heresyTracker -= 1;
  }
};

export const removeLevyAmount = (
  G: MyGameState,
  playerID: string,
  levyAmount: number
) => {
  G.playerInfo[playerID].resources.levies -= levyAmount;
};

export const addLevyAmount = (
  G: MyGameState,
  playerID: string,
  levyAmount: number
) => {
  G.playerInfo[playerID].resources.levies += levyAmount;
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