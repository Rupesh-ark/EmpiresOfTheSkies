import { Move } from "boardgame.io";
// FIX: Import Ctx from the main package
import { Ctx } from "boardgame.io";
import { MyGameState } from "../../types";
import { findPossibleDestinations } from "../../helpers/helpers";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeGoldAmount, removeOneCounsellor } from "../resourceUpdates";
import { checkCounsellorsNotZero } from "../moveValidation";

// FIX: Removed broken imports (EventsAPI, RandomAPI)

const deployFleet: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }
  
  // Safety check for player existence
  if (!G.playerInfo[playerID]) {
    return INVALID_MOVE;
  }

  const selectedFleetIndex = args[0];

  const currentPlayer = G.playerInfo[playerID];
  const fleet = currentPlayer.fleetInfo[selectedFleetIndex];

  // Safety check for fleet existence
  if (!fleet) {
     console.log("Fleet not found");
     return INVALID_MOVE;
  }

  const startingCoords = fleet.location;

  // Destructure with safety check in case args are missing
  if (!args[1]) return INVALID_MOVE;
  const [x, y] = args[1];

  const skyshipCount = args[2];
  const regimentCount = args[3];
  const levyCount = args[4];

  const unladen = fleet.regiments === 0 && fleet.levies === 0;

  // Logic: Check if player has resources (assuming [4,0] is "base" or "reserve")
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

  // Update fleet composition
  fleet.skyships = skyshipCount;
  fleet.regiments = regimentCount;
  fleet.levies = levyCount;

  // Deduct resources from player
  currentPlayer.resources.skyships -= skyshipCount;
  currentPlayer.resources.regiments -= regimentCount;
  currentPlayer.resources.levies -= levyCount;
  G.playerInfo[playerID].turnComplete = true;

  // Validate Destination
  let destinationValid = false;

  // Use the helper to find valid moves
  // findPossibleDestinations returns [allValid, cost1, cost2, cost3]
  const possibleDestinations = findPossibleDestinations(G, startingCoords, unladen);
  
  // Ensure we got back valid arrays
  if (!possibleDestinations || possibleDestinations.length < 4) {
      return INVALID_MOVE;
  }

  const validDestinations = possibleDestinations[0];
  const coordsCostingOneGold = possibleDestinations[1];
  const coordsCostingTwoGold = possibleDestinations[2];
  const coordsCostingThreeGold = possibleDestinations[3];

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

  // Calculate Cost
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

  // Update Fleet Location
  // We need to verify fleet exists in fleetInfo array before assignment
  if (G.playerInfo[playerID].fleetInfo[fleet.fleetId]) {
      G.playerInfo[playerID].fleetInfo[fleet.fleetId].location = [x, y];
  }

  // Update Battle Map
  // Remove player from old location
  if (G.mapState.battleMap[startingCoords[1]] && G.mapState.battleMap[startingCoords[1]][startingCoords[0]]) {
      const oldLocList = G.mapState.battleMap[startingCoords[1]][startingCoords[0]];
      const index = oldLocList.indexOf(playerID);
      if (index > -1) {
          oldLocList.splice(index, 1);
      }
  }

  // Add player to new location
  if (G.mapState.battleMap[y] && G.mapState.battleMap[y][x]) {
    if (!G.mapState.battleMap[y][x].includes(playerID)) {
        G.mapState.battleMap[y][x].push(playerID);
    }
    console.log(G.mapState.battleMap[y][x]);
  }

  // Finalize Move
  removeGoldAmount(G, playerID, cost);
  G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet = true;

  removeOneCounsellor(G, playerID);
  G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchDisabled = args[0];

  G.playerInfo[playerID].turnComplete = true;
};

export default deployFleet;

const doCoordsMatch = (coordsA: number[], coordsB: number[]): boolean => {
  return coordsA[0] === coordsB[0] && coordsA[1] === coordsB[1];
};