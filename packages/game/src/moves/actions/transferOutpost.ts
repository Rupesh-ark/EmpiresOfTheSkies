import { MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateOutpostTransfer } from "../../helpers/stateUtils";

const transferOutpost: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const tileCoords: [number, number] = args[0];
    const targetPlayerID: string = args[1];

    if (targetPlayerID === playerID) {
      return INVALID_MOVE;
    }

    if (!G.playerInfo[targetPlayerID]) {
      return INVALID_MOVE;
    }

    const error = validateOutpostTransfer(G, playerID, targetPlayerID, tileCoords);
    if (error) {
      return INVALID_MOVE;
    }

    // Transfer ownership
    const [x, y] = tileCoords;
    G.mapState.buildings[y][x].player = G.playerInfo[targetPlayerID];
  },
  errorMessage: "Cannot transfer this outpost",
};

export default transferOutpost;
