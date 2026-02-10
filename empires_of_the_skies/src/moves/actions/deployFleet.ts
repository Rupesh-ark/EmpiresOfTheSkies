import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { findPossibleDestinations } from "../../helpers/helpers";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeGoldAmount, removeOneCounsellor } from "../resourceUpdates";
import { checkCounsellorsNotZero } from "../moveValidation";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

const deployFleet: Move<MyGameState> = (
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
  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }
  const selectedFleetIndex = args[0];

  const currentPlayer = G.playerInfo[playerID];
  const fleet = currentPlayer.fleetInfo[selectedFleetIndex];

  const startingCoords = fleet.location;

  const [x, y] = args[1];

  const skyshipCount = args[2];
  const regimentCount = args[3];
  const levyCount = args[4];

  const unladen = fleet.regiments === 0 && fleet.levies === 0;

  if (fleet.location[0] === 4 && fleet.location[1] === 0) {
    if (
      currentPlayer.resources.skyships < skyshipCount ||
      currentPlayer.resources.regiments < regimentCount ||
      currentPlayer.resources.levies < levyCount
    ) {
      console.log(
        "Player has attempted to deploy more of a resource than they have ready, something has gone wrong..."
      );
      return INVALID_MOVE;
    }
  }
  if (skyshipCount === 0) {
    console.log("Player has attempted to deploy a fleet with no skyships");
    return INVALID_MOVE;
  }

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
    console.log(
      "Player is attempting to deploy a fleet to a tile outwith its range"
    );
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
  console.log(G.mapState.battleMap[y][x]);

  removeGoldAmount(G, playerID, cost);
  G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet =
    true;

  removeOneCounsellor(G, playerID);
  G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchDisabled =
    args[0];

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
