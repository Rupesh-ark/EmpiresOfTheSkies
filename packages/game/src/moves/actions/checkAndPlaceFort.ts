import { MoveDefinition, MyGameState, MoveError } from "../../types";

const validateCheckAndPlaceFort = (G: MyGameState, playerID: string, coords: [number, number]): MoveError | null => {
  const [x, y] = coords;
  const tileInfo = G.mapState.buildings[y][x];
  if (tileInfo === undefined) {
    return { code: "INVALID_TILE", message: "No buildable tile at those coordinates" };
  }
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
    return { code: "INVALID_FORT_PLACEMENT", message: "Need your outpost/colony with troops and no existing fort" };
  }
  return null;
};

const checkAndPlaceFort: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const coords: [number, number] = args[0];
    const [x, y] = coords;
    const tileInfo = G.mapState.buildings[y][x];

    tileInfo.fort = true;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot place a Fort here",
  validate: validateCheckAndPlaceFort,
};

export default checkAndPlaceFort;
