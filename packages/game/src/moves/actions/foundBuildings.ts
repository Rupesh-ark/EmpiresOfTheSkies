import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";
import { removeOneCounsellor, HERESY_MAX, HERESY_MIN } from "../../helpers/stateUtils";
import {
  BuildingSlot,
  BUILDING_BASE_COST,
  MAX_CATHEDRALS,
  MAX_PALACES,
  MAX_SHIPYARDS,
  CATHEDRAL_VP,
  PALACE_VP_HERETIC,
  PALACE_VP_ORTHODOX,
} from "../../codifiedGameInfo";
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
  if (validateMove(playerID, G, { costsCounsellor: true, costsGold: true })) return INVALID_MOVE;
  const value: keyof typeof G.boardState.foundBuildings = args[0] + 1;

  const specialisedBuildingFunctions = {
    [BuildingSlot.Cathedral]: foundCathedral,
    [BuildingSlot.Palace]:    foundPalace,
    [BuildingSlot.Shipyard]:  foundShipyard,
    [BuildingSlot.Fort]:      foundFort,
  };

  return specialisedBuildingFunctions[value](G, playerID, events, args);
};

const foundCathedral = (
  G: MyGameState,
  playerID: string,
  events: EventsAPI,
  args: any[]
): void | typeof INVALID_MOVE => {
  if (G.playerInfo[playerID].cathedrals === MAX_CATHEDRALS) {
    return INVALID_MOVE;
  }
  if (G.playerInfo[playerID].hereticOrOrthodox === "heretic") {
    return INVALID_MOVE;
  }
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
  events: EventsAPI,
  args: any[]
): void | typeof INVALID_MOVE => {
  if (G.playerInfo[playerID].palaces === MAX_PALACES) {
    return INVALID_MOVE;
  }

  // args[1] is the heresy direction chosen by the player ("advance" or "retreat")
  const heresyDirection: "advance" | "retreat" = args[1];
  if (heresyDirection !== "advance" && heresyDirection !== "retreat") {
    return INVALID_MOVE;
  }

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
  events: EventsAPI,
  args: any[]
): void | typeof INVALID_MOVE => {
  if (G.playerInfo[playerID].shipyards === MAX_SHIPYARDS) {
    return INVALID_MOVE;
  }
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
  events: EventsAPI,
  args: any[]
): void | typeof INVALID_MOVE => {
  // Validate that at least one valid tile exists before charging
  const hasValidTile = G.mapState.buildings.some((row, y) =>
    row.some((tile, x) => {
      const hasBuilding = tile.player?.id === playerID &&
        (tile.buildings === "colony" || tile.buildings === "outpost");
      const hasTroops = tile.garrisonedRegiments > 0 || tile.garrisonedLevies > 0 ||
        G.playerInfo[playerID].fleetInfo.some(
          (f) => f.location[0] === x && f.location[1] === y && (f.regiments > 0 || f.levies > 0)
        );
      return hasBuilding && !tile.fort && hasTroops;
    })
  );
  if (!hasValidTile) return INVALID_MOVE;

  const cost = BUILDING_BASE_COST.fort + G.boardState.foundBuildings[BuildingSlot.Fort].length;

  G.playerInfo[playerID].resources.gold -= cost;
  G.boardState.foundBuildings[BuildingSlot.Fort].push(playerID);
  removeOneCounsellor(G, playerID);

  G.playerInfo[playerID].turnComplete = false;
};
export default foundBuildings;
