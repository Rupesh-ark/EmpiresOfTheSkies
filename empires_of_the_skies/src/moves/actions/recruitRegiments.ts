import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addRegiments,
  removeGoldAmount,
  removeOneCounsellor,
} from "../resourceUpdates";

// FIX: Removed broken internal imports (Ctx, EventsAPI, RandomAPI)

const recruitRegiments: Move<MyGameState> = (
  {
    G,
    playerID,
  },
  ...args: any[]
) => {
  if (checkCounsellorsNotZero(playerID, G)) {
    return INVALID_MOVE;
  }
  
  // Cast value to key type
  const value = (args[0] + 1) as keyof typeof G.boardState.recruitRegiments;

  if (G.boardState.recruitRegiments[value] !== undefined) {
    console.log("Player has chosen an action which has already been taken");
    return INVALID_MOVE;
  }
  
  const cost: { [key: number]: number } = {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 3,
    6: 4,
  };
  const reward: { [key: number]: number } = {
    1: 1,
    2: 2,
    3: 4,
    4: 6,
    5: 7,
    6: 9,
  };

  // Safety check to ensure cost/reward exists
  if (cost[value as number] === undefined || reward[value as number] === undefined) {
      return INVALID_MOVE;
  }

  removeOneCounsellor(G, playerID);
  removeGoldAmount(G, playerID, cost[value as number]);
  addRegiments(G, playerID, reward[value as number]);
  
  G.boardState.recruitRegiments[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default recruitRegiments;