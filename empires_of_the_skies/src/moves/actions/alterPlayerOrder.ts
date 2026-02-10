import { Move } from "boardgame.io";
// FIX: Import Ctx from the main package
import { Ctx } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { PlayerOrder, MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { removeOneCounsellor } from "../resourceUpdates";

// FIX: Removed broken imports (EventsAPI, RandomAPI) and manual type definitions.
// TypeScript infers the types automatically from Move<MyGameState>.

export const alterPlayerOrder: Move<MyGameState> = (
  { G, ctx },
  ...args: any[]
) => {
  // logic remains exactly the same
  const newPosition = (args[0] + 1) as keyof PlayerOrder;
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