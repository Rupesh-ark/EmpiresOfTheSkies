import { Move } from "boardgame.io";
import { MyGameState, PlayerColour } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addGoldAmount,
  removeGoldAmount,
  removeOneCounsellor,
} from "../resourceUpdates";

// FIX: Removed broken internal imports (Ctx, EventsAPI, RandomAPI)
// FIX: Removed unused arguments (ctx, events, random)

const influencePrelates: Move<MyGameState> = (
  {
    G,
    playerID,
  },
  ...args: any[]
) => {
  // Cast value to the correct key type for influencePrelates
  const value = (args[0] + 1) as keyof typeof G.boardState.influencePrelates;

  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }

  if (G.boardState.influencePrelates[value] !== undefined) {
    console.log("Player has selected a move which has already been taken");
    return INVALID_MOVE;
  }
  
  let recipientOfPayment: string | undefined;
  let cost = 1;

  const kingdomToIDMap: { [key: number]: string | null } = {
    1: PlayerColour.red,
    2: PlayerColour.blue,
    3: PlayerColour.yellow,
    4: null,
    5: null,
    6: PlayerColour.brown,
    7: PlayerColour.white,
    8: PlayerColour.green,
  };

  Object.entries(G.playerInfo).forEach(([id, playerInfo]) => {
    // Ensure value is treated as a number for the map lookup
    if (playerInfo.colour === kingdomToIDMap[value as number]) {
      recipientOfPayment = id;
      cost = playerInfo.cathedrals;
    }
  });

  if (recipientOfPayment) {
    addGoldAmount(G, recipientOfPayment, cost);
  }
  removeGoldAmount(G, playerID, cost);

  removeOneCounsellor(G, playerID);

  G.boardState.influencePrelates[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default influencePrelates;