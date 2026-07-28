import { MoveDefinition, MoveError, MyGameState } from "../../types.js";
import { nextAfterGroundDecision, nextAfterConquest } from "../../helpers/resolutionSequencer.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { toBuildingOwner } from "../../helpers/stateUtils.js";

const validateGarrisonTroops = (
  G: MyGameState,
  _playerID: string,
  troopCounts: unknown
): MoveError | null => {
  if (G.step !== "ground_garrison" && G.step !== "conquest_garrison") {
    return { code: "WRONG_STAGE", message: "Troops can only be garrisoned at the garrison step" };
  }
  if (!Array.isArray(troopCounts) || troopCounts.length < 2) {
    return { code: "INVALID_TROOPS", message: "Garrison troop counts are required" };
  }

  const [regiments, levies, eliteRegiments = 0] = troopCounts;
  if (
    ![regiments, levies, eliteRegiments].every(
      (count) => Number.isInteger(count) && count >= 0
    )
  ) {
    return { code: "INVALID_TROOPS", message: "Garrison troop counts must be non-negative integers" };
  }

  const available = G.troopsAvailableForGarrison;
  if (
    regiments > available.regiments ||
    levies > available.levies ||
    eliteRegiments > available.elites
  ) {
    return { code: "TROOPS_UNAVAILABLE", message: "Cannot garrison more troops than are available at this battle" };
  }

  return null;
};

const garrisonTroops: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    if (validateGarrisonTroops(G, playerID, args[0])) return INVALID_MOVE;

    const [x, y] = G.mapState.currentBattle;
    const [regiments, levies, eliteRegiments = 0] = args[0];
    const troopInfo: GarrisonTroopsInfo = {
      regiments: regiments,
      levies: levies,
      eliteRegiments: eliteRegiments,
    };
    G.mapState.buildings[y][x].garrisonedRegiments += troopInfo.regiments;
    G.mapState.buildings[y][x].garrisonedLevies += troopInfo.levies;
    G.mapState.buildings[y][x].garrisonedEliteRegiments += troopInfo.eliteRegiments;

    G.mapState.buildings[y][x].player = toBuildingOwner(G.playerInfo[playerID]);

    G.playerInfo[playerID].fleetInfo.forEach((fleet) => {
      const [fleetX, fleetY] = fleet.location;
      if (fleetX === x && fleetY === y) {
        if (troopInfo.regiments > 0) {
          if (fleet.regiments >= troopInfo.regiments) {
            fleet.regiments -= troopInfo.regiments;
            troopInfo.regiments = 0;
          } else {
            troopInfo.regiments -= fleet.regiments;
            fleet.regiments = 0;
          }
        }
        if (troopInfo.levies > 0) {
          if (fleet.levies >= troopInfo.levies) {
            fleet.levies -= troopInfo.levies;
            troopInfo.levies = 0;
          } else {
            troopInfo.levies -= fleet.levies;
            fleet.levies = 0;
          }
        }
        if (troopInfo.eliteRegiments > 0) {
          if (fleet.eliteRegiments >= troopInfo.eliteRegiments) {
            fleet.eliteRegiments -= troopInfo.eliteRegiments;
            troopInfo.eliteRegiments = 0;
          } else {
            troopInfo.eliteRegiments -= fleet.eliteRegiments;
            fleet.eliteRegiments = 0;
          }
        }
      }
    });

    G.playerInfo[playerID].troopsToGarrison = undefined;

    if (G.step === "ground_garrison") {
      nextAfterGroundDecision(G, ctx, events, playerID);
    } else if (G.step === "conquest_garrison") {
      nextAfterConquest(G, events);
    }
  },
  errorMessage: "Cannot garrison troops right now",
  validate: validateGarrisonTroops,
};

type GarrisonTroopsInfo = {
  regiments: number;
  levies: number;
  eliteRegiments: number;
};

export default garrisonTroops;
