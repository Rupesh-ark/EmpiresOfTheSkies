import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { removeGoldAmount, removeOneCounsellor } from "../resourceUpdates";

// FIX: Removed broken internal imports (Ctx, EventsAPI, RandomAPI)

const trainTroops: Move<MyGameState> = (
  {
    G,
    playerID,
  },
  ...args: any[]
) => {
  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }
  
  // Cast args to key type (assuming number based on usage)
  const value = (args[0] + 1) as keyof typeof G.boardState.trainTroops;

  // Check if slot is taken
  if (G.boardState.trainTroops[value] !== undefined) {
    console.log("Player has selected a move which has already been taken.");
    return INVALID_MOVE;
  }

  // Draw cards based on the value (1 or 2 cards usually)
  // Ensure value is treated as a number for the loop
  const loopCount = Number(value);
  
  for (let i = 0; i < loopCount; i++) {
    const card = drawFortuneOfWarCard(G);

    G.playerInfo[playerID].resources.fortuneCards.push({
      ...card,
      flipped: false,
    });
  }

  removeOneCounsellor(G, playerID);
  
  // Cost logic
  if (value === 2) {
    removeGoldAmount(G, playerID, 1);
  }
  
  G.boardState.trainTroops[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default trainTroops;