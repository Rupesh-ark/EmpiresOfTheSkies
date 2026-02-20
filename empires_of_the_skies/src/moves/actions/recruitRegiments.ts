import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addRegiments,
  removeGoldAmount,
  removeOneCounsellor,
} from "../resourceUpdates";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

const recruitRegiments: Move<MyGameState> = (
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
  const value: keyof typeof G.boardState.recruitRegiments = args[0] + 1;
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
  removeOneCounsellor(G, playerID);
  removeGoldAmount(G, playerID, cost[value]);
  addRegiments(G, playerID, reward[value]);
  G.boardState.recruitRegiments[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default recruitRegiments;
