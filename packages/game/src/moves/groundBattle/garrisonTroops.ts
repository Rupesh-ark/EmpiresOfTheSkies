import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { findNextConquest, findNextGroundBattle } from "../../helpers/findNext";

const garrisonTroops: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
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

  G.mapState.buildings[y][x].player = G.playerInfo[playerID];

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

  if (ctx.phase === "ground_battle") {
    findNextGroundBattle(G, events);
  } else if (ctx.phase === "conquest") {
    findNextConquest(G, events);
  }
};

type GarrisonTroopsInfo = {
  regiments: number;
  levies: number;
  eliteRegiments: number;
};

export default garrisonTroops;
