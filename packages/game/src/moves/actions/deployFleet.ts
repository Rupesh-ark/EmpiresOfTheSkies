import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { findPossibleDestinations } from "../../helpers/helpers";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeGoldAmount, removeOneCounsellor } from "../../helpers/stateUtils";
import { validateMove } from "../moveValidation";
import { KINGDOM_LOCATION, MAX_SKYSHIPS_PER_FLEET } from "../../codifiedGameInfo";

const validateDeployFleet = (
  G: MyGameState,
  playerID: string,
  selectedFleetIndex: number,
  destination: [number, number],
  skyshipCount: number,
  regimentCount: number,
  levyCount: number,
  eliteRegimentCount: number = 0
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const currentPlayer = G.playerInfo[playerID];
  const fleet = currentPlayer.fleetInfo[selectedFleetIndex];

  if (!fleet) {
    return { code: "INVALID_FLEET", message: "No fleet found at that index" };
  }

  const atHome =
    fleet.location[0] === KINGDOM_LOCATION[0] &&
    fleet.location[1] === KINGDOM_LOCATION[1];

  if (atHome) {
    if (currentPlayer.resources.skyships < skyshipCount) {
      return {
        code: "INSUFFICIENT_SKYSHIPS",
        message: `Not enough Skyships — need ${skyshipCount}, have ${currentPlayer.resources.skyships}`,
      };
    }
    if (currentPlayer.resources.regiments < regimentCount) {
      return {
        code: "INSUFFICIENT_REGIMENTS",
        message: `Not enough Regiments — need ${regimentCount}, have ${currentPlayer.resources.regiments}`,
      };
    }
    if (currentPlayer.resources.levies < levyCount) {
      return {
        code: "INSUFFICIENT_LEVIES",
        message: `Not enough Levies — need ${levyCount}, have ${currentPlayer.resources.levies}`,
      };
    }
    if (currentPlayer.resources.eliteRegiments < eliteRegimentCount) {
      return {
        code: "INSUFFICIENT_ELITE_REGIMENTS",
        message: `Not enough Elite Regiments — need ${eliteRegimentCount}, have ${currentPlayer.resources.eliteRegiments}`,
      };
    }
  }

  if (skyshipCount === 0) {
    return { code: "NO_SKYSHIPS_ASSIGNED", message: "A fleet must have at least 1 Skyship" };
  }

  if (skyshipCount > MAX_SKYSHIPS_PER_FLEET) {
    return {
      code: "FLEET_SIZE_EXCEEDED",
      message: `A fleet may carry at most ${MAX_SKYSHIPS_PER_FLEET} Skyships`,
    };
  }

  if (regimentCount + levyCount + eliteRegimentCount > skyshipCount) {
    return {
      code: "TROOP_CAPACITY_EXCEEDED",
      message: "Cannot carry more troops than Skyships (1 troop per Skyship)",
    };
  }

  const startCoords = fleet.location;
  const unladen = regimentCount === 0 && levyCount === 0;
  const [validDestinations] = findPossibleDestinations(G, startCoords, unladen);
  const isValidDest = validDestinations.some(
    (c) => c[0] === destination[0] && c[1] === destination[1]
  );
  if (!isValidDest) {
    return { code: "INVALID_DESTINATION", message: "That destination is not reachable" };
  }

  return null;
};

const deployFleet: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const selectedFleetIndex = args[0];
    const [x, y] = args[1];
    const skyshipCount = args[2];
    const regimentCount = args[3];
    const levyCount = args[4];
    const eliteRegimentCount = args[5] ?? 0;

    if (validateDeployFleet(G, playerID, selectedFleetIndex, [x, y], skyshipCount, regimentCount, levyCount, eliteRegimentCount)) return INVALID_MOVE;

    const currentPlayer = G.playerInfo[playerID];
    const fleet = currentPlayer.fleetInfo[selectedFleetIndex];

    const startingCoords = fleet.location;
    const unladen = regimentCount === 0 && levyCount === 0 && eliteRegimentCount === 0;

    const [
      ,
      coordsCostingOneGold,
      coordsCostingTwoGold,
      coordsCostingThreeGold,
    ] = findPossibleDestinations(G, startingCoords, unladen);

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

    fleet.skyships = skyshipCount;
    fleet.regiments = regimentCount;
    fleet.levies = levyCount;
    fleet.eliteRegiments = eliteRegimentCount;

    currentPlayer.resources.skyships -= skyshipCount;
    currentPlayer.resources.regiments -= regimentCount;
    currentPlayer.resources.levies -= levyCount;
    currentPlayer.resources.eliteRegiments -= eliteRegimentCount;

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
  },
  errorMessage: "Cannot dispatch fleet right now",
  validate: validateDeployFleet,
  successLog: (G, pid, _fleetIndex, dest, sky, reg, lev, elite) => {
    const k = G.playerInfo[pid].kingdomName;
    const eliteStr = elite ? `, ${elite}E` : "";
    return `${k} dispatches fleet to [${dest}] (${sky}S, ${reg}R, ${lev}L${eliteStr})`;
  },
};

export default deployFleet;

const doCoordsMatch = (coordsA: number[], coordsB: number[]): boolean => {
  if (coordsA[0] === coordsB[0] && coordsA[1] === coordsB[1]) {
    return true;
  } else {
    return false;
  }
};
