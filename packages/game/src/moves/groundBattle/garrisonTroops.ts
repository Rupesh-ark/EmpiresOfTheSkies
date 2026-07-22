import { MoveDefinition } from "../../types.js";
import { nextAfterGroundDecision, nextAfterConquest } from "../../helpers/resolutionSequencer.js";
import { INVALID_MOVE } from "boardgame.io/core";
import log from "../../helpers/logger.js";
import { toBuildingOwner } from "../../helpers/stateUtils.js";

const gtLog = log.child({ mod: "garrison-troops" });

const garrisonTroops: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    // Defensive: validate args
    if (!Array.isArray(args[0]) || args[0].length < 1) {
      gtLog.warn({ args }, "Invalid args");
      return INVALID_MOVE;
    }
    
    const [x, y] = G.mapState.currentBattle;
    let [regiments, levies, eliteRegiments = 0] = args[0];
    
    // Sanitize NaN values
    regiments = (typeof regiments === 'number' && !isNaN(regiments)) ? regiments : 0;
    levies = (typeof levies === 'number' && !isNaN(levies)) ? levies : 0;
    eliteRegiments = (typeof eliteRegiments === 'number' && !isNaN(eliteRegiments)) ? eliteRegiments : 0;
    
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
};

type GarrisonTroopsInfo = {
  regiments: number;
  levies: number;
  eliteRegiments: number;
};

export default garrisonTroops;
