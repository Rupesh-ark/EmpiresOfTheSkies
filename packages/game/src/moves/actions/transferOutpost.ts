import { MoveDefinition, MyGameState, MoveError } from "../../types";
import { validateOutpostTransfer } from "../../helpers/stateUtils";

const validateTransferOutpost = (G: MyGameState, playerID: string, tileCoords: [number, number], targetPlayerID: string): MoveError | null => {
  if (targetPlayerID === playerID) {
    return { code: "SELF_TRANSFER", message: "Cannot transfer an outpost to yourself" };
  }
  if (!G.playerInfo[targetPlayerID]) {
    return { code: "INVALID_TARGET", message: "Target player does not exist" };
  }
  const error = validateOutpostTransfer(G, playerID, targetPlayerID, tileCoords);
  if (error) {
    return { code: "TRANSFER_FAILED", message: error };
  }
  return null;
};

const transferOutpost: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const tileCoords: [number, number] = args[0];
    const targetPlayerID: string = args[1];
    const [x, y] = tileCoords;
    G.mapState.buildings[y][x].player = G.playerInfo[targetPlayerID];
  },
  errorMessage: "Cannot transfer this outpost",
  validate: validateTransferOutpost,
};

export default transferOutpost;
