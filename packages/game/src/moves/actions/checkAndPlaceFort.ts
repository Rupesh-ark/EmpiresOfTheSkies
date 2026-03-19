import { MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

const checkAndPlaceFort: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const coords: [number, number] = args[0];
    const [x, y] = coords;
    const tileInfo = G.mapState.buildings[y][x];
    if (tileInfo === undefined) {
      return INVALID_MOVE;
    }
    // GAP-10: validate fort placement — must have outpost/colony + regiments or levies (garrisoned or in fleet)
    const hasBuilding =
      tileInfo.player?.id === playerID &&
      (tileInfo.buildings === "colony" || tileInfo.buildings === "outpost");
    const noFortYet = !tileInfo.fort;

    const hasGarrisonedTroops =
      tileInfo.garrisonedRegiments > 0 || tileInfo.garrisonedLevies > 0;
    const hasFleetTroops = G.playerInfo[playerID].fleetInfo.some(
      (f) => f.location[0] === x && f.location[1] === y && (f.regiments > 0 || f.levies > 0)
    );

    if (!hasBuilding || !noFortYet || (!hasGarrisonedTroops && !hasFleetTroops)) {
      return INVALID_MOVE;
    }

    tileInfo.fort = true;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot place a Fort here",
};

export default checkAndPlaceFort;
