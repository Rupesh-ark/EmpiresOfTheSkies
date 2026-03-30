import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { findPossibleDestinations } from "../../helpers/helpers";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeGoldAmount, removeOneCounsellor } from "../../helpers/stateUtils";
import { validateDeployFleet } from "../moveValidation";
import { KINGDOM_LOCATION } from "../../codifiedGameInfo";
const deployFleet: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  const selectedFleetIndex = args[0];
  const [x, y] = args[1];
  const skyshipCount = args[2];
  const regimentCount = args[3];
  const levyCount = args[4];

  if (validateDeployFleet(G, playerID, selectedFleetIndex, [x, y], skyshipCount, regimentCount, levyCount)) return INVALID_MOVE;

  const currentPlayer = G.playerInfo[playerID];
  const fleet = currentPlayer.fleetInfo[selectedFleetIndex];

  const startingCoords = fleet.location;

  const unladen = regimentCount === 0 && levyCount === 0;

  fleet.skyships = skyshipCount;
  fleet.regiments = regimentCount;
  fleet.levies = levyCount;

  currentPlayer.resources.skyships -= skyshipCount;
  currentPlayer.resources.regiments -= regimentCount;
  currentPlayer.resources.levies -= levyCount;
  G.playerInfo[playerID].turnComplete = true;

  let destinationValid = false;

  const [
    validDestinations,
    coordsCostingOneGold,
    coordsCostingTwoGold,
    coordsCostingThreeGold,
  ] = findPossibleDestinations(G, startingCoords, unladen);

  validDestinations.forEach((coords) => {
    if (coords[0] === x && coords[1] === y) {
      destinationValid = true;
    }
  });

  if (!destinationValid) {
    return INVALID_MOVE;
  }

  let cost = 0;

  coordsCostingThreeGold.forEach((coords) => {
    if (doCoordsMatch(coords, [x, y])) {
      cost = 3;
    }
  });
  coordsCostingTwoGold.forEach((coords) => {
    if (doCoordsMatch(coords, [x, y])) {
      cost = 2;
    }
  });
  coordsCostingOneGold.forEach((coords) => {
    if (doCoordsMatch(coords, [x, y])) {
      cost = 1;
    }
  });
  G.playerInfo[playerID].fleetInfo[fleet.fleetId].location = [x, y];

  G.mapState.battleMap[startingCoords[1]][startingCoords[0]].splice(
    G.mapState.battleMap[startingCoords[1]][startingCoords[0]].indexOf(
      playerID
    ),
    1
  );

  if (!G.mapState.battleMap[y][x].includes(playerID)) {
    G.mapState.battleMap[y][x].push(playerID);
  }

  removeGoldAmount(G, playerID, cost);
  G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet =
    true;

  removeOneCounsellor(G, playerID);
  G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchDisabled =
    true;

  G.playerInfo[playerID].turnComplete = true;
};

export default deployFleet;

const doCoordsMatch = (coordsA: number[], coordsB: number[]): boolean => {
  if (coordsA[0] === coordsB[0] && coordsA[1] === coordsB[1]) {
    return true;
  } else {
    return false;
  }
};
