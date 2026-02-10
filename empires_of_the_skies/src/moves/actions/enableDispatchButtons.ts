import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { removeOneCounsellor } from "../resourceUpdates";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

const enableDispatchButtons: Move<MyGameState> = (
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
  if (
    G.playerInfo[playerID].playerBoardCounsellorLocations.dispatchSkyshipFleet
  ) {
    console.log(
      "Player has attempted to dispatch skyship fleet twice in once phase of play"
    );
    return INVALID_MOVE;
  }
};

export default enableDispatchButtons;
