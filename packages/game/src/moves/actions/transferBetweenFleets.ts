import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

const KINGDOM_LOCATION: [number, number] = [4, 0];
const MAX_SKYSHIPS_PER_FLEET = 5;

const transferBetweenFleets: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  const sourceFleetIndex: number = args[0];
  const targetFleetIndex: number = args[1];
  const skyships: number = args[2];
  const regiments: number = args[3];
  const levies: number = args[4];

  const currentPlayer = G.playerInfo[playerID];
  const sourceFleet = currentPlayer.fleetInfo[sourceFleetIndex];
  const targetFleet = currentPlayer.fleetInfo[targetFleetIndex];

  if (!sourceFleet || !targetFleet) {
    console.log("Invalid fleet index");
    return INVALID_MOVE;
  }

  if (sourceFleetIndex === targetFleetIndex) {
    console.log("Cannot transfer to the same fleet");
    return INVALID_MOVE;
  }

  // Both fleets must be at the same location
  if (
    sourceFleet.location[0] !== targetFleet.location[0] ||
    sourceFleet.location[1] !== targetFleet.location[1]
  ) {
    console.log("Fleets must be at the same location to transfer");
    return INVALID_MOVE;
  }

  // Kingdom transfers use passFleetInfoToPlayerInfo instead
  if (
    sourceFleet.location[0] === KINGDOM_LOCATION[0] &&
    sourceFleet.location[1] === KINGDOM_LOCATION[1]
  ) {
    console.log("Use Kingdom board for transfers at home");
    return INVALID_MOVE;
  }

  // Source must have enough resources
  if (
    sourceFleet.skyships < skyships ||
    sourceFleet.regiments < regiments ||
    sourceFleet.levies < levies
  ) {
    console.log("Source fleet does not have enough resources to transfer");
    return INVALID_MOVE;
  }

  // Target fleet cannot exceed max skyships
  if (targetFleet.skyships + skyships > MAX_SKYSHIPS_PER_FLEET) {
    console.log("Target fleet would exceed max skyships");
    return INVALID_MOVE;
  }

  // Target fleet: troops cannot exceed skyships (1 troop per skyship)
  const targetTroopsAfter =
    targetFleet.regiments + regiments + targetFleet.levies + levies;
  const targetSkyshipsAfter = targetFleet.skyships + skyships;
  if (targetTroopsAfter > targetSkyshipsAfter) {
    console.log("Target fleet cannot carry more troops than skyships");
    return INVALID_MOVE;
  }

  // Source fleet: remaining troops cannot exceed remaining skyships
  const sourceTroopsAfter =
    sourceFleet.regiments - regiments + sourceFleet.levies - levies;
  const sourceSkyshipsAfter = sourceFleet.skyships - skyships;
  if (sourceTroopsAfter > sourceSkyshipsAfter && sourceSkyshipsAfter > 0) {
    console.log("Source fleet would have more troops than skyships after transfer");
    return INVALID_MOVE;
  }

  // Perform the transfer
  sourceFleet.skyships -= skyships;
  sourceFleet.regiments -= regiments;
  sourceFleet.levies -= levies;

  targetFleet.skyships += skyships;
  targetFleet.regiments += regiments;
  targetFleet.levies += levies;
};

export default transferBetweenFleets;
