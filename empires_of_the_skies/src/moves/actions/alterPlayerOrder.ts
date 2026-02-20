import { Move } from "boardgame.io";
import { PlayerOrder, MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeOneCounsellor } from "../resourceUpdates";
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
  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }
  if (ctx.numPlayers < newPosition) {
    console.log("Player has chosen a position that is out of bounds");
    return INVALID_MOVE;
  }
  if (G.playerOrder[newPosition] !== undefined) {
    console.log("Player has chosen a position that is already taken");
    return INVALID_MOVE;
  }
  for (const value of Object.values(G.playerOrder)) {
    if (value === playerID) {
      console.log("Player has already altered their position");
      return INVALID_MOVE;
    }
  }
  removeOneCounsellor(G, playerID);
  G.boardState.alterPlayerOrder[newPosition] = playerID;
  G.playerOrder[newPosition] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default alterPlayerOrder;
