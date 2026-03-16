import { Move } from "boardgame.io";
import { PlayerOrder, MyGameState } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeOneCounsellor } from "../../helpers/stateUtils";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

export const alterPlayerOrder: Move<MyGameState> = (
  {
    G,
    ctx,
    events,
    random,
  }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
    random: RandomAPI;
  },
  ...args: any[]
) => {
  const newPosition: keyof PlayerOrder = args[0] + 1;
  const playerID = ctx.currentPlayer;
  if (validateMove(playerID, G, { costsCounsellor: true })) return INVALID_MOVE;
  if (ctx.numPlayers < newPosition) {
    return INVALID_MOVE;
  }
  if (G.boardState.pendingPlayerOrder[newPosition] !== undefined) {
    return INVALID_MOVE;
  }
  for (const value of Object.values(G.boardState.pendingPlayerOrder)) {
    if (value === playerID) {
      return INVALID_MOVE;
    }
  }
  removeOneCounsellor(G, playerID);
  G.boardState.pendingPlayerOrder[newPosition] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default alterPlayerOrder;
