import { MoveDefinition, MyGameState, MoveError } from "../../types";
import { MAX_SKYSHIPS_PER_FLEET, KINGDOM_LOCATION } from "../../codifiedGameInfo";

const validateTransferBetweenFleets = (
  G: MyGameState,
  playerID: string,
  sourceFleetIndex: number,
  targetFleetIndex: number,
  skyships: number,
  regiments: number,
  levies: number,
  eliteRegiments?: number
): MoveError | null => {
  const elite = eliteRegiments ?? 0;
  const currentPlayer = G.playerInfo[playerID];
  const sourceFleet = currentPlayer.fleetInfo[sourceFleetIndex];
  const targetFleet = currentPlayer.fleetInfo[targetFleetIndex];

  if (!sourceFleet || !targetFleet) {
    return { code: "INVALID_FLEET", message: "Fleet not found" };
  }
  if (sourceFleetIndex === targetFleetIndex) {
    return { code: "SAME_FLEET", message: "Cannot transfer to the same fleet" };
  }
  if (sourceFleet.location[0] !== targetFleet.location[0] || sourceFleet.location[1] !== targetFleet.location[1]) {
    return { code: "DIFFERENT_LOCATION", message: "Fleets must be at the same location" };
  }
  if (sourceFleet.location[0] === KINGDOM_LOCATION[0] && sourceFleet.location[1] === KINGDOM_LOCATION[1]) {
    return { code: "AT_KINGDOM", message: "Use kingdom reserves transfer instead" };
  }
  if (sourceFleet.skyships < skyships || sourceFleet.regiments < regiments || sourceFleet.levies < levies || sourceFleet.eliteRegiments < elite) {
    return { code: "INSUFFICIENT_RESOURCES", message: "Source fleet doesn't have enough to transfer" };
  }
  if (targetFleet.skyships + skyships > MAX_SKYSHIPS_PER_FLEET) {
    return { code: "FLEET_SIZE_EXCEEDED", message: `Target fleet would exceed max ${MAX_SKYSHIPS_PER_FLEET} Skyships` };
  }
  const targetTroopsAfter = targetFleet.regiments + regiments + targetFleet.levies + levies + targetFleet.eliteRegiments + elite;
  const targetSkyshipsAfter = targetFleet.skyships + skyships;
  if (targetTroopsAfter > targetSkyshipsAfter) {
    return { code: "TARGET_TROOP_CAPACITY", message: "Target fleet can't carry that many troops" };
  }
  const sourceTroopsAfter = sourceFleet.regiments - regiments + sourceFleet.levies - levies + sourceFleet.eliteRegiments - elite;
  const sourceSkyshipsAfter = sourceFleet.skyships - skyships;
  if (sourceTroopsAfter > sourceSkyshipsAfter && sourceSkyshipsAfter > 0) {
    return { code: "SOURCE_TROOP_CAPACITY", message: "Source fleet can't hold remaining troops after transfer" };
  }
  return null;
};

const transferBetweenFleets: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const sourceFleetIndex: number = args[0];
    const targetFleetIndex: number = args[1];
    const skyships: number = args[2];
    const regiments: number = args[3];
    const levies: number = args[4];
    const eliteRegiments: number = args[5] ?? 0;

    const currentPlayer = G.playerInfo[playerID];
    const sourceFleet = currentPlayer.fleetInfo[sourceFleetIndex];
    const targetFleet = currentPlayer.fleetInfo[targetFleetIndex];

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
  validate: validateTransferBetweenFleets,
};

export default transferBetweenFleets;
