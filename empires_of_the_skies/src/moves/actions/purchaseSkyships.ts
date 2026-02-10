import { Move } from "boardgame.io";
// FIX: Import Ctx from the main package
import { Ctx } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { checkCounsellorsNotZero } from "../moveValidation";
import {
  addSkyship,
  removeGoldAmount,
  removeOneCounsellor,
} from "../resourceUpdates";

// FIX: Removed broken imports (EventsAPI, RandomAPI)

const purchaseSkyships: Move<MyGameState> = (
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
  const value = (args[0] + 1) as keyof typeof G.boardState.purchaseSkyships;

  if (G.boardState.purchaseSkyships[value] !== undefined) {
    console.log("Player has chosen an action which has already been taken");
    return INVALID_MOVE;
  }
  
  // update this to reflect rules regarding the orthodox vs heretic issues
  const cost: { [key: number]: number } = {
    1: 1,
    2: 3,
    3: 4,
    4: 1,
    5: 3,
    6: 4,
  };

  const reward: { [key: number]: number } = {
    1: 1,
    2: 2,
    3: 2,
    4: 1,
    5: 2,
    6: 2,
  };

  // Safety check: Ensure cost/reward exists for the given value
  if (cost[value as number] === undefined || reward[value as number] === undefined) {
      return INVALID_MOVE;
  }

  removeOneCounsellor(G, playerID);
  removeGoldAmount(G, playerID, cost[value as number]);
  
  for (let i = 0; i < reward[value as number]; i++) {
    addSkyship(G, playerID);
  }
  
  G.boardState.purchaseSkyships[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default purchaseSkyships;