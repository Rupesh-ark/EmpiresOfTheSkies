import { Move } from "boardgame.io";
// FIX: Import Ctx from the main package
import { Ctx } from "boardgame.io";
import { MyGameState } from "../../types";
import {
  removeGoldAmount,
  removeOneCounsellor,
  removeVPAmount,
} from "../resourceUpdates";
import { INVALID_MOVE } from "boardgame.io/core";
import { checkCounsellorsNotZero } from "../moveValidation";

// FIX: Removed broken imports (EventsAPI, RandomAPI)

const convertMonarch: Move<MyGameState> = (
  {
    G,
    ctx, // ctx is used for numPlayers, so we keep it
    playerID,
  },
  ...args: any[]
) => {
  const value = (args[0] + 1) as keyof typeof G.boardState.convertMonarch;
  const playerInfo = G.playerInfo[playerID];

  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }

  if (G.boardState.convertMonarch[value] !== undefined) {
    console.log("Player has chosen a move which is already taken");
    return INVALID_MOVE;
  }
  if (value > ctx.numPlayers) {
    console.log(
      "Player has selected a move which is only available in games with more players"
    );
    return INVALID_MOVE;
  }

  let hasConvertedMonarchAlready = false;
  Object.values(G.boardState.convertMonarch).forEach((id) => {
    if (id === playerID) hasConvertedMonarchAlready = true;
  });
  if (hasConvertedMonarchAlready) {
    console.log("Player has already converted monarch");
    return INVALID_MOVE;
  }

  const cost: Record<number, () => void | typeof INVALID_MOVE> = {
    1: () => {
      if (playerInfo.resources.counsellors < 3) {
        return INVALID_MOVE;
      } else {
        removeOneCounsellor(G, playerID);
        removeOneCounsellor(G, playerID);
      }
    },
    2: () => {
      removeVPAmount(G, playerID, 3);
    },
    3: () => {
      if (playerInfo.resources.counsellors < 2) {
        return INVALID_MOVE;
      } else {
        removeOneCounsellor(G, playerID);
      }
    },
    4: () => {
      removeVPAmount(G, playerID, 2);
    },
    5: () => {
      removeVPAmount(G, playerID, 1);
    },
    6: () => {
      removeGoldAmount(G, playerID, 1);
    },
  };

  // We need to check if the specific cost function returns INVALID_MOVE
  if (cost[value as number] && cost[value as number]() === INVALID_MOVE) {
    return INVALID_MOVE;
  }
  
  if (playerInfo.hereticOrOrthodox === "heretic") {
    playerInfo.hereticOrOrthodox = "orthodox";
    playerInfo.heresyTracker -= playerInfo.prisoners;
    playerInfo.prisoners = 0;
  } else {
    playerInfo.hereticOrOrthodox = "heretic";
    playerInfo.heresyTracker += playerInfo.prisoners;
    playerInfo.prisoners = 0;
  }

  removeOneCounsellor(G, playerID);

  G.boardState.convertMonarch[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default convertMonarch;