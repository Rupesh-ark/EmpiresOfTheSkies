import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { checkCounsellorsNotZero } from "../moveValidation";
import { removeOneCounsellor } from "../resourceUpdates";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

// needs a stage where the player selects a map tile to place the fort onto and that tile is verified to ensure they can build on it
const foundBuildings: Move<MyGameState> = (
  {
    G,
    ctx,
    playerID,
    events,
    random,
  }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
    random: RandomAPI;
  },
  ...args: any[]
) => {
  if (checkCounsellorsNotZero(playerID, G)) {
    return INVALID_MOVE;
  }
  const value: keyof typeof G.boardState.foundBuildings = args[0] + 1;

  const specialisedBuildingFunctions = {
    1: foundCathedral,
    2: foundPalace,
    3: foundShipyard,
    4: foundFort,
  };

  return specialisedBuildingFunctions[value](G, playerID, events, args);
};

const foundCathedral = (
  G: MyGameState,
  playerID: string,
  events: EventsAPI,
  args: any[]
): void | typeof INVALID_MOVE => {
  if (G.playerInfo[playerID].cathedrals === 6) {
    return INVALID_MOVE;
  }
  if (G.playerInfo[playerID].hereticOrOrthodox === "heretic") {
    return INVALID_MOVE;
  }
  const cost = 5 + G.boardState.foundBuildings[1].length;
  G.playerInfo[playerID].resources.gold -= cost;
  G.playerInfo[playerID].cathedrals += 1;
  G.playerInfo[playerID].resources.victoryPoints += 2;
  if (G.playerInfo[playerID].heresyTracker > -11) {
    G.playerInfo[playerID].heresyTracker -= 1;
  }
  G.boardState.foundBuildings[1].push(playerID);
  removeOneCounsellor(G, playerID);
  G.playerInfo[playerID].turnComplete = true;
};
//TODO: add a input for the user to select the heresy tracker movement direction
const foundPalace = (
  G: MyGameState,
  playerID: string,
  events: EventsAPI,
  args: any[]
): void | typeof INVALID_MOVE => {
  if (G.playerInfo[playerID].palaces === 6) {
    return INVALID_MOVE;
  }

  const cost = 5 + G.boardState.foundBuildings[2].length;

  G.playerInfo[playerID].resources.gold -= cost;
  G.playerInfo[playerID].palaces += 1;
  if (G.playerInfo[playerID].hereticOrOrthodox === "heretic") {
    G.playerInfo[playerID].resources.victoryPoints += 2;
  } else {
    G.playerInfo[playerID].resources.victoryPoints += 1;
  }
  G.boardState.foundBuildings[2].push(playerID);
  removeOneCounsellor(G, playerID);

  G.playerInfo[playerID].turnComplete = true;
};

const foundShipyard = (
  G: MyGameState,
  playerID: string,
  events: EventsAPI,
  args: any[]
): void | typeof INVALID_MOVE => {
  if (G.playerInfo[playerID].shipyards === 3) {
    return INVALID_MOVE;
  }
  const cost = 3 + G.boardState.foundBuildings[3].length;

  G.playerInfo[playerID].resources.gold -= cost;
  G.playerInfo[playerID].shipyards += 1;
  G.boardState.foundBuildings[3].push(playerID);
  removeOneCounsellor(G, playerID);

  G.playerInfo[playerID].turnComplete = true;
};
//TODO: add capability for the user to select the map tile to build the fort on
// and validate that they have either an outpost or colony on that tile as well as regiments
const foundFort = (
  G: MyGameState,
  playerID: string,
  events: EventsAPI,
  args: any[]
): void | typeof INVALID_MOVE => {
  const cost = 3;

  G.playerInfo[playerID].resources.gold -= cost;
  removeOneCounsellor(G, playerID);

  G.playerInfo[playerID].turnComplete = false;
};
export default foundBuildings;
