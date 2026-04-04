import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { findPossibleDestinations } from "../../helpers/helpers";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeGoldAmount, removeOneCounsellor } from "../../helpers/stateUtils";
import { validateMove } from "../moveValidation";

const validateMoveFleet = (
  G: MyGameState,
  playerID: string,
  fleetIndex: number,
  destination: [number, number]
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const fleet = G.playerInfo[playerID].fleetInfo[fleetIndex];

  if (!fleet) {
    return { code: "INVALID_FLEET", message: "No fleet found at that index" };
  }

  if (fleet.skyships === 0) {
    return { code: "NO_SKYSHIPS_ASSIGNED", message: "A fleet must have at least 1 Skyship" };
  }

  const unladen =
    fleet.regiments === 0 && fleet.levies === 0 && fleet.eliteRegiments === 0;

  const [validDestinations] = findPossibleDestinations(G, fleet.location, unladen);
  const isValidDest = validDestinations.some(
    (c) => c[0] === destination[0] && c[1] === destination[1]
  );
  if (!isValidDest) {
    return { code: "INVALID_DESTINATION", message: "That destination is not reachable" };
  }

  return null;
};

const moveFleet: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args: any[]) => {
    const fleetIndex: number = args[0];
    const [x, y]: [number, number] = args[1];

    if (validateMoveFleet(G, playerID, fleetIndex, [x, y])) return INVALID_MOVE;

    const fleet = G.playerInfo[playerID].fleetInfo[fleetIndex];
    const startingCoords = fleet.location;

    const unladen =
      fleet.regiments === 0 && fleet.levies === 0 && fleet.eliteRegiments === 0;

    const [
      ,
      coordsCostingOneGold,
      coordsCostingTwoGold,
      coordsCostingThreeGold,
    ] = findPossibleDestinations(G, startingCoords, unladen);

    let cost = 0;
    coordsCostingThreeGold.forEach((coords) => {
      if (coords[0] === x && coords[1] === y) cost = 3;
    });
    coordsCostingTwoGold.forEach((coords) => {
      if (coords[0] === x && coords[1] === y) cost = 2;
    });
    coordsCostingOneGold.forEach((coords) => {
      if (coords[0] === x && coords[1] === y) cost = 1;
    });

    fleet.location = [x, y];
    fleet.travelHistory.push([x, y]);

    // Only remove from battleMap if no other fleets of this player remain on the old tile
    const otherFleetsOnOldTile = G.playerInfo[playerID].fleetInfo.some(
      (f) => f !== fleet && f.location[0] === startingCoords[0] && f.location[1] === startingCoords[1] && f.skyships > 0
    );
    if (!otherFleetsOnOldTile) {
      const oldArr = G.mapState.battleMap[startingCoords[1]][startingCoords[0]];
      const idx = oldArr.indexOf(playerID);
      if (idx !== -1) oldArr.splice(idx, 1);
    }

    if (!G.mapState.battleMap[y][x].includes(playerID)) {
      G.mapState.battleMap[y][x].push(playerID);
    }

    removeGoldAmount(G, playerID, cost);
    G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet = true;

    removeOneCounsellor(G, playerID);
    G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchDisabled = true;

    G.playerInfo[playerID].turnComplete = true;
    events.endTurn();
  },
  errorMessage: "Cannot move fleet right now",
  validate: validateMoveFleet,
  successLog: (G, pid, fleetIndex, dest) => {
    const k = G.playerInfo[pid].kingdomName;
    const fleet = G.playerInfo[pid].fleetInfo[fleetIndex];
    const eliteStr = fleet.eliteRegiments ? `, ${fleet.eliteRegiments}E` : "";
    return `${k} deploys fleet to [${dest}] (${fleet.skyships}S, ${fleet.regiments}R, ${fleet.levies}L${eliteStr})`;
  },
};

export default moveFleet;
