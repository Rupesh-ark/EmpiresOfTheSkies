import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateFoundBuildings } from "../moveValidation";
import { removeOneCounsellor, HERESY_MAX, HERESY_MIN } from "../../helpers/stateUtils";
import {
  BuildingSlot,
  BUILDING_BASE_COST,
  CATHEDRAL_VP,
  PALACE_VP_HERETIC,
  PALACE_VP_ORTHODOX,
} from "../../codifiedGameInfo";

// needs a stage where the player selects a map tile to place the fort onto and that tile is verified to ensure they can build on it
const foundBuildings: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  const heresyDirection: "advance" | "retreat" | undefined = args[1];
  if (validateFoundBuildings(G, playerID, args[0], heresyDirection)) return INVALID_MOVE;
  const value: keyof typeof G.boardState.foundBuildings = args[0] + 1;

  const specialisedBuildingFunctions = {
    [BuildingSlot.Cathedral]: foundCathedral,
    [BuildingSlot.Palace]:    foundPalace,
    [BuildingSlot.Shipyard]:  foundShipyard,
    [BuildingSlot.Fort]:      foundFort,
  };

  return specialisedBuildingFunctions[value](G, playerID, args);
};

const foundCathedral = (
  G: MyGameState,
  playerID: string,
  _args: any[]
): void => {
  const cost = BUILDING_BASE_COST.cathedral + G.boardState.foundBuildings[BuildingSlot.Cathedral].length;
  G.playerInfo[playerID].resources.gold -= cost;
  G.playerInfo[playerID].cathedrals += 1;
  G.playerInfo[playerID].resources.victoryPoints += CATHEDRAL_VP;
  if (G.playerInfo[playerID].heresyTracker > HERESY_MIN) {
    G.playerInfo[playerID].heresyTracker -= 1;
  }
  G.boardState.foundBuildings[BuildingSlot.Cathedral].push(playerID);
  removeOneCounsellor(G, playerID);
  G.playerInfo[playerID].turnComplete = true;
};
const foundPalace = (
  G: MyGameState,
  playerID: string,
  args: any[]
): void => {
  // args[1] is the heresy direction chosen by the player ("advance" or "retreat")
  // validateFoundBuildings already confirmed this is "advance" or "retreat"
  const heresyDirection: "advance" | "retreat" = args[1];

  const cost = BUILDING_BASE_COST.palace + G.boardState.foundBuildings[BuildingSlot.Palace].length;

  G.playerInfo[playerID].resources.gold -= cost;
  G.playerInfo[playerID].palaces += 1;
  if (G.playerInfo[playerID].hereticOrOrthodox === "heretic") {
    G.playerInfo[playerID].resources.victoryPoints += PALACE_VP_HERETIC;
  } else {
    G.playerInfo[playerID].resources.victoryPoints += PALACE_VP_ORTHODOX;
  }

  // Rule: founding a Palace moves the heresy tracker one space in the player's chosen direction
  const tracker = G.playerInfo[playerID].heresyTracker;
  if (heresyDirection === "advance" && tracker < HERESY_MAX) {
    G.playerInfo[playerID].heresyTracker += 1;
  } else if (heresyDirection === "retreat" && tracker > HERESY_MIN) {
    G.playerInfo[playerID].heresyTracker -= 1;
  }

  G.boardState.foundBuildings[BuildingSlot.Palace].push(playerID);
  removeOneCounsellor(G, playerID);

  G.playerInfo[playerID].turnComplete = true;
};

const foundShipyard = (
  G: MyGameState,
  playerID: string,
  _args: any[]
): void => {
  const cost = BUILDING_BASE_COST.shipyard + G.boardState.foundBuildings[BuildingSlot.Shipyard].length;

  G.playerInfo[playerID].resources.gold -= cost;
  G.playerInfo[playerID].shipyards += 1;
  G.boardState.foundBuildings[BuildingSlot.Shipyard].push(playerID);
  removeOneCounsellor(G, playerID);

  G.playerInfo[playerID].turnComplete = true;
};
// Fort placement: pays cost here, then player picks a tile via checkAndPlaceFort move.
// Frontend shows valid tiles in a dialog (ActionBoardButton handles this).
const foundFort = (
  G: MyGameState,
  playerID: string,
  _args: any[]
): void => {
  // validateFoundBuildings already confirmed a valid tile exists before we charge.
  const cost = BUILDING_BASE_COST.fort + G.boardState.foundBuildings[BuildingSlot.Fort].length;

  G.playerInfo[playerID].resources.gold -= cost;
  G.boardState.foundBuildings[BuildingSlot.Fort].push(playerID);
  removeOneCounsellor(G, playerID);

  G.playerInfo[playerID].turnComplete = false;
};
export default foundBuildings;
