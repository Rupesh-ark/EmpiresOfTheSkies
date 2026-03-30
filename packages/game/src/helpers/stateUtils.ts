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
  G.playerInfo[playerID].resources.skyships += 1;
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
  G.playerInfo[playerID].resources.regiments += amount;
};

export const increaseHeresyWithinMove = (G: MyGameState, playerID: string) => {
  if (G.playerInfo[playerID].heresyTracker < 12) {
    G.playerInfo[playerID].heresyTracker += 1;
  }
};

export const increaseOrthodoxyWithinMove = (
  G: MyGameState,
  playerID: string
) => {
  if (G.playerInfo[playerID].heresyTracker > -11) {
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