import { MyGameState } from "../../types";
import { Move } from "boardgame.io";
import { checkCounsellorsNotZero } from "../moveValidation";
import { addOneCounsellor, removeGoldAmount } from "../resourceUpdates";
import { INVALID_MOVE } from "boardgame.io/core";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

export const recruitCounsellors: Move<MyGameState> = (
  {
    G,
    ctx,
    playerID,
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
  if (checkCounsellorsNotZero(playerID, G)) {
    return INVALID_MOVE;
  }

  const value: keyof typeof G.boardState.recruitCounsellors = args[0] + 1;
  if (G.boardState.recruitCounsellors[value] !== undefined) {
    console.log("Player selected a move which has already been taken");
    return INVALID_MOVE;
  }
  const costs: { [key: number]: number } = { 1: 0, 2: 1, 3: 3 };
  if (value === 3) {
    addOneCounsellor(G, playerID);
  }
  G.boardState.recruitCounsellors[value] = playerID;
  removeGoldAmount(G, playerID, costs[value]);
  G.playerInfo[playerID].turnComplete = true;
};

export default recruitCounsellors;
