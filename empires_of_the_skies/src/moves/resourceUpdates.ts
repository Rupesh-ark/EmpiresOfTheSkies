import { Move } from "boardgame.io";
import { MyGameState } from "../types";
import { INVALID_MOVE } from "boardgame.io/core";
// FIX: Import Ctx from the main package
import { Ctx } from "boardgame.io";
import { clearMoves } from "../helpers/helpers";

// FIX: Removed broken imports (EventsAPI, RandomAPI)

export const removeOneCounsellor = (G: MyGameState, playerID: string) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.counsellors -= 1;
  }
};
export const addOneCounsellor = (G: MyGameState, playerID: string) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.counsellors += 1;
  }
};
export const removeVPAmount = (
  G: MyGameState,
  playerID: string,
  vpAmount: number
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.victoryPoints -= vpAmount;
  }
};

export const addVPAmount = (
  G: MyGameState,
  playerID: string,
  vpAmount: number
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.victoryPoints += vpAmount;
  }
};

export const removeGoldAmount = (
  G: MyGameState,
  playerID: string,
  goldAmount: number
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.gold -= goldAmount;
  }
};

export const addGoldAmount = (
  G: MyGameState,
  playerID: string,
  goldAmount: number
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.gold += goldAmount;
  }
};

export const removeSkyship = (G: MyGameState, playerID: string) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.skyships -= 1;
  }
};
export const addSkyship = (G: MyGameState, playerID: string) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.skyships += 1;
  }
};

export const removeRegiments = (
  G: MyGameState,
  playerID: string,
  amount: number
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.regiments -= amount;
  }
};

export const addRegiments = (
  G: MyGameState,
  playerID: string,
  amount: number
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.regiments += amount;
  }
};

// FIX: Removed manual type annotation
export const increaseHeresy: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  increaseHeresyWithinMove(G, playerID);
};

export const increaseHeresyWithinMove = (G: MyGameState, playerID: string) => {
  if (
    G.playerInfo[playerID] &&
    G.playerInfo[playerID].heresyTracker < 12
  ) {
    G.playerInfo[playerID].heresyTracker += 1;
  }
};

// FIX: Removed manual type annotation
export const increaseOrthodoxy: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  increaseOrthodoxyWithinMove(G, playerID);
};

export const increaseOrthodoxyWithinMove = (
  G: MyGameState,
  playerID: string
) => {
  if (
    G.playerInfo[playerID] &&
    G.playerInfo[playerID].heresyTracker > -11
  ) {
    G.playerInfo[playerID].heresyTracker -= 1;
  }
};

// FIX: Removed manual type annotation
export const checkAndPlaceFort: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  const [x, y] = args[0];
  const props = args[1];
  let tileInfo = G.mapState.buildings[y][x];
  if (tileInfo === undefined) {
    clearMoves(props);
    return INVALID_MOVE;
  }
  let hasRelevantPresence = false;
  if (tileInfo.player) {
    if (
      tileInfo.player.id === playerID &&
      (tileInfo.buildings === "colony" || tileInfo.buildings === "outpost") &&
      tileInfo.fort === false &&
      (tileInfo.garrisonedRegiments ? tileInfo.garrisonedRegiments > 0 : false)
    ) {
      hasRelevantPresence = true;
    }
  }

  if (!hasRelevantPresence) {
    clearMoves(props);
    return INVALID_MOVE;
  }

  tileInfo.fort = true;
  G.playerInfo[playerID].turnComplete = true;
};

// FIX: Removed manual type annotation
export const flipCards: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.fortuneCards.forEach((card) => {
      card.flipped = true;
    });
  }
};

export const removeLevyAmount = (
  G: MyGameState,
  playerID: string,
  levyAmount: number
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.levies -= levyAmount;
  }
};

export const addLevyAmount = (
  G: MyGameState,
  playerID: string,
  levyAmount: number
) => {
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.levies += levyAmount;
  }
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