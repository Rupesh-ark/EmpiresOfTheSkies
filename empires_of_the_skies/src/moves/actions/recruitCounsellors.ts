import { MyGameState } from "../../types";
import { Move } from "boardgame.io";
// FIX: Import Ctx from the main package (even if unused, good practice)
import { Ctx } from "boardgame.io";
import { checkCounsellorsNotZero } from "../moveValidation";
import { addOneCounsellor, removeGoldAmount } from "../resourceUpdates";
import { INVALID_MOVE } from "boardgame.io/core";

// FIX: Removed broken imports (EventsAPI, RandomAPI)

export const recruitCounsellors: Move<MyGameState> = (
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
  const value = (args[0] + 1) as keyof typeof G.boardState.recruitCounsellors;
  
  if (G.boardState.recruitCounsellors[value] !== undefined) {
    console.log("Player selected a move which has already been taken");
    return INVALID_MOVE;
  }
  
  const costs: { [key: number]: number } = { 1: 0, 2: 1, 3: 3 };

  // Safety check to ensure cost exists
  if (costs[value as number] === undefined) {
      return INVALID_MOVE;
  }

  if (value === 3) {
    addOneCounsellor(G, playerID);
  }
  
  G.boardState.recruitCounsellors[value] = playerID;
  removeGoldAmount(G, playerID, costs[value as number]);
  G.playerInfo[playerID].turnComplete = true;
};

export default recruitCounsellors;