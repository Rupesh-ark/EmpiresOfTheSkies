import { MoveDefinition, MyGameState, MoveError } from "../../types";
import { KINGDOM_LOCATION } from "../../data/gameData";

const validateEnableDispatchButtons = (G: MyGameState, playerID: string): MoveError | null => {
  const player = G.playerInfo[playerID];
  const hasUndispatchedFleet = player.fleetInfo.some((fleet) => {
    if (fleet.dispatchedThisRound) return false;
    const atHome =
      fleet.location[0] === KINGDOM_LOCATION[0] &&
      fleet.location[1] === KINGDOM_LOCATION[1];
    return !atHome || fleet.skyships > 0;
  });
  if (!hasUndispatchedFleet) {
    return { code: "ALL_FLEETS_DISPATCHED", message: "All fleets have been dispatched this round" };
  }
  return null;
};

const enableDispatchButtons: MoveDefinition = {
  fn: () => {},
  errorMessage: "Dispatch is not available",
  validate: validateEnableDispatchButtons,
};

export default enableDispatchButtons;
