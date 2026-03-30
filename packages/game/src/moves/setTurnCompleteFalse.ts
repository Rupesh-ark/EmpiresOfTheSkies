import { Move } from "boardgame.io";
import { MyGameState } from "../types";
import { Ctx } from "boardgame.io/dist/types/src/types";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";

const setTurnCompleteFalse: Move<MyGameState> = (
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
  G.playerInfo[playerID].turnComplete = false;
};

export default setTurnCompleteFalse;
