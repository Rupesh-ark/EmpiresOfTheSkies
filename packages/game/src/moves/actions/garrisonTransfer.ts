import { MoveDefinition, MyGameState, MoveError } from "../../types.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { humanizeTileName } from "../../helpers/helpers.js";
import log from "../../helpers/logger.js";

const gLog = log.child({ mod: "garrison-transfer" });

const validateGarrisonTransfer = (
  G: MyGameState,
  playerID: string,
  fleetId: number,
  tileCoords: [number, number],
  regiments: number,
  levies: number,
  eliteRegiments: number
): MoveError | null => {
  if (regiments === 0 && levies === 0 && eliteRegiments === 0) {
    return { code: "NO_TRANSFER", message: "At least one troop type must be non-zero" };
  }

  const player = G.playerInfo[playerID];
  const fleet = player.fleetInfo.find((f) => f.fleetId === fleetId);

  if (!fleet) {
    return { code: "INVALID_FLEET", message: "No fleet found with that ID" };
  }

  const [x, y] = tileCoords;
  if (fleet.location[0] !== x || fleet.location[1] !== y) {
    return {
      code: "FLEET_NOT_AT_TILE",
      message: "Fleet is not at the specified tile coordinates",
    };
  }

  const building = G.mapState.buildings[y]?.[x];
  if (
    !building ||
    (building.buildings !== "outpost" && building.buildings !== "colony") ||
    building.player?.id !== playerID
  ) {
    return {
      code: "NO_BUILDING",
      message: "No outpost or colony owned by you at those coordinates",
    };
  }

  // Check source for each troop type based on direction
  if (regiments > 0 && fleet.regiments < regiments) {
    return {
      code: "INSUFFICIENT_FLEET_REGIMENTS",
      message: `Fleet only has ${fleet.regiments} Regiment(s), cannot transfer ${regiments}`,
    };
  }
  if (regiments < 0 && building.garrisonedRegiments < -regiments) {
    return {
      code: "INSUFFICIENT_GARRISON_REGIMENTS",
      message: `Garrison only has ${building.garrisonedRegiments} Regiment(s), cannot transfer ${-regiments}`,
    };
  }

  if (levies > 0 && fleet.levies < levies) {
    return {
      code: "INSUFFICIENT_FLEET_LEVIES",
      message: `Fleet only has ${fleet.levies} Lev(ies), cannot transfer ${levies}`,
    };
  }
  if (levies < 0 && building.garrisonedLevies < -levies) {
    return {
      code: "INSUFFICIENT_GARRISON_LEVIES",
      message: `Garrison only has ${building.garrisonedLevies} Lev(ies), cannot transfer ${-levies}`,
    };
  }

  if (eliteRegiments > 0 && fleet.eliteRegiments < eliteRegiments) {
    return {
      code: "INSUFFICIENT_FLEET_ELITE_REGIMENTS",
      message: `Fleet only has ${fleet.eliteRegiments} Elite Regiment(s), cannot transfer ${eliteRegiments}`,
    };
  }
  if (eliteRegiments < 0 && building.garrisonedEliteRegiments < -eliteRegiments) {
    return {
      code: "INSUFFICIENT_GARRISON_ELITE_REGIMENTS",
      message: `Garrison only has ${building.garrisonedEliteRegiments} Elite Regiment(s), cannot transfer ${-eliteRegiments}`,
    };
  }

  // After transfer, fleet troops must not exceed fleet skyships
  const fleetTroopsAfter =
    (fleet.regiments - regiments) +
    (fleet.levies - levies) +
    (fleet.eliteRegiments - eliteRegiments);
  if (fleetTroopsAfter > fleet.skyships) {
    return {
      code: "FLEET_TROOP_CAPACITY_EXCEEDED",
      message: `Fleet can only carry ${fleet.skyships} troop(s) (1 per Skyship), would have ${fleetTroopsAfter}`,
    };
  }

  return null;
};

const garrisonTransfer: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const fleetId: number = args[0];
    const tileCoords: [number, number] = args[1];
    const regiments: number = args[2];
    const levies: number = args[3];
    const eliteRegiments: number = args[4];

    // Defensive: validate args are valid numbers
    if (typeof levies !== 'number' || isNaN(levies)) {
      gLog.warn({ levies }, "Invalid levies arg");
      return INVALID_MOVE;
    }
    if (typeof regiments !== 'number' || isNaN(regiments)) {
      gLog.warn({ regiments }, "Invalid regiments arg");
      return INVALID_MOVE;
    }

    if (validateGarrisonTransfer(G, playerID, fleetId, tileCoords, regiments, levies, eliteRegiments)) {
      return INVALID_MOVE;
    }

    const [x, y] = tileCoords;
    const player = G.playerInfo[playerID];
    const fleet = player.fleetInfo.find((f) => f.fleetId === fleetId)!;
    const building = G.mapState.buildings[y][x];

    // positive = fleet → garrison, negative = garrison → fleet
    fleet.regiments -= regiments;
    fleet.levies -= levies;
    fleet.eliteRegiments -= eliteRegiments;

    building.garrisonedRegiments += regiments;
    building.garrisonedLevies += levies;
    building.garrisonedEliteRegiments += eliteRegiments;
  },
  errorMessage: "Cannot transfer troops to/from garrison right now",
  validate: validateGarrisonTransfer,
  successLog: (G, pid, _fleetId, tileCoords, regiments, levies, eliteRegiments) => {
    const k = G.playerInfo[pid].kingdomName;
    const landName = humanizeTileName(G.mapState.currentTileArray[tileCoords[1]][tileCoords[0]]?.name ?? `[${tileCoords}]`);
    const parts: string[] = [];
    if (regiments > 0) parts.push(`${regiments}R`);
    if (regiments < 0) parts.push(`${-regiments}R`);
    if (levies > 0) parts.push(`${levies}L`);
    if (levies < 0) parts.push(`${-levies}L`);
    if (eliteRegiments > 0) parts.push(`${eliteRegiments}E`);
    if (eliteRegiments < 0) parts.push(`${-eliteRegiments}E`);
    const direction = (regiments + levies + eliteRegiments) > 0 ? "fleet → garrison" : "garrison → fleet";
    return `${k} transfers troops at ${landName} (${parts.join(", ")} ${direction})`;
  },
};

export default garrisonTransfer;
