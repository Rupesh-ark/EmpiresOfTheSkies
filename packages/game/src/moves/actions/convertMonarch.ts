import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import {
  removeGoldAmount,
  removeOneCounsellor,
} from "../../helpers/stateUtils";
import { INVALID_MOVE } from "boardgame.io/core";
import { Ctx } from "boardgame.io/dist/types/src/types";

const convertMonarch: Move<MyGameState> = (
  { G, ctx, playerID }: { G: MyGameState; ctx: Ctx; playerID: string },
  ...args: any[]
) => {
  const value: keyof typeof G.boardState.convertMonarch = args[0] + 1;
  const playerInfo = G.playerInfo[playerID];

  if (G.boardState.convertMonarch[value] !== undefined) {
    console.log("Player has chosen a slot which is already taken");
    return INVALID_MOVE;
  }
  if (value > ctx.numPlayers) {
    console.log("Player has selected a slot only available in larger games");
    return INVALID_MOVE;
  }

  const alreadyConverting = Object.values(G.boardState.convertMonarch).some(
    (id) => id === playerID
  );
  if (alreadyConverting) {
    console.log("Player has already placed a counsellor to convert monarch");
    return INVALID_MOVE;
  }

  // B5: cost = 2 Gold AND 1 extra counsellor (plus the placed counsellor = 2 total)
  if (playerInfo.resources.counsellors < 2) {
    return INVALID_MOVE;
  }
  if (playerInfo.resources.gold < 2) {
    return INVALID_MOVE;
  }

  removeGoldAmount(G, playerID, 2);
  removeOneCounsellor(G, playerID); // extra counsellor payment
  removeOneCounsellor(G, playerID); // counsellor placed on board

  if (playerInfo.hereticOrOrthodox === "heretic") {
    playerInfo.hereticOrOrthodox = "orthodox";
    playerInfo.heresyTracker -= playerInfo.prisoners;
    playerInfo.prisoners = 0;
  } else {
    playerInfo.hereticOrOrthodox = "heretic";
    playerInfo.heresyTracker += playerInfo.prisoners;
    playerInfo.prisoners = 0;
  }

  G.boardState.convertMonarch[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default convertMonarch;
