import { Move } from "boardgame.io";
// FIX: Import Ctx from the main package
import { Ctx } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { checkCounsellorsNotZero } from "../moveValidation";
import {
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  removeGoldAmount,
  removeOneCounsellor,
  removeVPAmount,
} from "../resourceUpdates";

// FIX: Removed broken imports (EventsAPI, RandomAPI)

//TODO: add functionality for executing prisoners
const punishDissenters: Move<MyGameState> = (
  {
    G,
    ctx, // ctx is used for numPlayers
    playerID,
  },
  ...args: any[]
) => {
  // Cast args to the correct key type
  const value = (args[0] + 1) as keyof typeof G.boardState.punishDissenters;
  
  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }
  if (args[0] + 1 > ctx.numPlayers) {
    console.log(
      "Player has selected a move which is only available in games with more players"
    );
    return INVALID_MOVE;
  }
  if (G.boardState.punishDissenters[value] !== undefined) {
    console.log("Player has selected a move which is already taken");
    return INVALID_MOVE;
  }

  let hasPunishedDissentersAlready = false;
  Object.values(G.boardState.punishDissenters).forEach((id) => {
    if (id === playerID) hasPunishedDissentersAlready = true;
  });
  if (hasPunishedDissentersAlready) {
    console.log("Player has already punished dissenters");
    return INVALID_MOVE;
  }

  const playerInfo = G.playerInfo[playerID];

  // Safety check
  if (!playerInfo) return INVALID_MOVE;

  if (playerInfo.prisoners === 3) {
    return INVALID_MOVE;
  }

  const cost: Record<number, () => void | typeof INVALID_MOVE> = {
    1: () => removeVPAmount(G, playerID, 3),
    2: () => {
      if (playerInfo.resources.counsellors < 2) {
        return INVALID_MOVE;
      } else {
        removeOneCounsellor(G, playerID);
      }
    },
    3: () => removeVPAmount(G, playerID, 2),
    4: () => removeVPAmount(G, playerID, 1),
    5: () => removeGoldAmount(G, playerID, 1),
    6: () => {},
  };

  const costFunction = cost[value as number];
  if (costFunction) {
      if (costFunction() === INVALID_MOVE) {
        return INVALID_MOVE;
      }
  } else {
      // Fallback if value isn't 1-6 (though UI should prevent this)
      return INVALID_MOVE;
  }

  removeOneCounsellor(G, playerID);
  playerInfo.prisoners += 1;

  if (G.playerInfo[playerID].hereticOrOrthodox === "orthodox") {
    increaseOrthodoxyWithinMove(G, playerID);
  } else {
    increaseHeresyWithinMove(G, playerID);
  }

  G.boardState.punishDissenters[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default punishDissenters;