import { MoveDefinition, MyGameState, MoveError } from "../../types";

const validateEnableDispatchButtons = (G: MyGameState, playerID: string): MoveError | null => {
  if (G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet) {
    return { code: "ALREADY_DISPATCHED", message: "Fleet dispatch already used" };
  }
  return null;
};

const enableDispatchButtons: MoveDefinition = {
  fn: () => {},
  errorMessage: "Dispatch is not available",
  validate: validateEnableDispatchButtons,
};

export default enableDispatchButtons;
