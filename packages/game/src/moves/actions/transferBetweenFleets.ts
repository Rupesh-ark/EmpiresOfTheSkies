import { MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { MAX_SKYSHIPS_PER_FLEET, KINGDOM_LOCATION } from "../../codifiedGameInfo";

const transferBetweenFleets: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const sourceFleetIndex: number = args[0];
    const targetFleetIndex: number = args[1];
    const skyships: number = args[2];
    const regiments: number = args[3];
    const levies: number = args[4];
    const eliteRegiments: number = args[5] ?? 0;  // backwards compatible

    const currentPlayer = G.playerInfo[playerID];
    const sourceFleet = currentPlayer.fleetInfo[sourceFleetIndex];
    const targetFleet = currentPlayer.fleetInfo[targetFleetIndex];

    if (!sourceFleet || !targetFleet) {
      return INVALID_MOVE;
    }

    if (sourceFleetIndex === targetFleetIndex) {
      return INVALID_MOVE;
    }

    // Both fleets must be at the same location
    if (
      sourceFleet.location[0] !== targetFleet.location[0] ||
      sourceFleet.location[1] !== targetFleet.location[1]
    ) {
      return INVALID_MOVE;
    }

    // Kingdom transfers use passFleetInfoToPlayerInfo instead
    if (
      sourceFleet.location[0] === KINGDOM_LOCATION[0] &&
      sourceFleet.location[1] === KINGDOM_LOCATION[1]
    ) {
      return INVALID_MOVE;
    }

    // Source must have enough resources
    if (
      sourceFleet.skyships < skyships ||
      sourceFleet.regiments < regiments ||
      sourceFleet.levies < levies ||
      sourceFleet.eliteRegiments < eliteRegiments
    ) {
      return INVALID_MOVE;
    }

    // Target fleet cannot exceed max skyships
    if (targetFleet.skyships + skyships > MAX_SKYSHIPS_PER_FLEET) {
      return INVALID_MOVE;
    }

    // Target fleet: troops cannot exceed skyships (1 troop per skyship)
    const targetTroopsAfter =
      targetFleet.regiments + regiments + targetFleet.levies + levies + targetFleet.eliteRegiments + eliteRegiments;
    const targetSkyshipsAfter = targetFleet.skyships + skyships;
    if (targetTroopsAfter > targetSkyshipsAfter) {
      return INVALID_MOVE;
    }

    // Source fleet: remaining troops cannot exceed remaining skyships
    const sourceTroopsAfter =
      sourceFleet.regiments - regiments + sourceFleet.levies - levies + sourceFleet.eliteRegiments - eliteRegiments;
    const sourceSkyshipsAfter = sourceFleet.skyships - skyships;
    if (sourceTroopsAfter > sourceSkyshipsAfter && sourceSkyshipsAfter > 0) {
      return INVALID_MOVE;
    }

    // Perform the transfer
    sourceFleet.skyships -= skyships;
    sourceFleet.regiments -= regiments;
    sourceFleet.levies -= levies;
    sourceFleet.eliteRegiments -= eliteRegiments;

    targetFleet.skyships += skyships;
    targetFleet.regiments += regiments;
    targetFleet.levies += levies;
    targetFleet.eliteRegiments += eliteRegiments;
  },
  errorMessage: "Cannot transfer between fleets",
};

export default transferBetweenFleets;
