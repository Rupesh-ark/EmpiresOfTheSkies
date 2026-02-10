import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { checkCounsellorsNotZero } from "../moveValidation";
import {
  addLevyAmount,
  removeOneCounsellor,
  removeVPAmount,
} from "../resourceUpdates";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

const conscriptLevies: Move<MyGameState> = (
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
  if (G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies) {
    console.log(
      "Player has attempted to conscript levies twice in the same phase of play"
    );
    return INVALID_MOVE;
  }

  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }

  const levyAmount: number = args[0];

  if (levyAmount === 0) {
    console.log("Player has attempted to conscript 0 levies");
    return INVALID_MOVE;
  }
  const cost = levyAmount / 3;
  removeOneCounsellor(G, playerID);
  removeVPAmount(G, playerID, cost);
  addLevyAmount(G, playerID, levyAmount);
  G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default conscriptLevies;
