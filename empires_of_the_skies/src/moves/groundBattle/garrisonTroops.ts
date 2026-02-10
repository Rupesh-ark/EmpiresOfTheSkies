import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { findNextConquest, findNextGroundBattle } from "../../helpers/findNext";

const garrisonTroops: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const [x, y] = G.mapState.currentBattle;
  const [regiments, levies] = args[0];
  const troopInfo: GarrisonTroopsInfo = {
    regiments: regiments,
    levies: levies,
  };
  console.log(`Garrisoning ${troopInfo.regiments} regiments`);
  G.mapState.buildings[y][x].garrisonedRegiments += troopInfo.regiments;

  console.log(`Garrisoning ${troopInfo.levies} levies`);
  G.mapState.buildings[y][x].garrisonedLevies += troopInfo.levies;

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
    }
  });

  G.playerInfo[playerID].troopsToGarrison = undefined;

  if (ctx.phase === "ground-attack") {
    findNextGroundBattle(G, events);
  } else if (ctx.phase === "conquest") {
    findNextConquest(G, events);
  }
};

type GarrisonTroopsInfo = {
  regiments: number;
  levies: number;
};

export default garrisonTroops;
