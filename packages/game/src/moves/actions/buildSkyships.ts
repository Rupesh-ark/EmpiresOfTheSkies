import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addSkyship,
  removeGoldAmount,
  removeOneCounsellor,
} from "../resourceUpdates";
import { Ctx } from "boardgame.io/dist/types/src/types.js";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events.js";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random.js";

const buildSkyships: Move<MyGameState> = (
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
  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }

  if (G.playerInfo[playerID].shipyards === 0) {
    console.log("Player tried to build skyships without having any shipyards");
    return INVALID_MOVE;
  }

  if (
    G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships === true
  ) {
    console.log(
      "Player has attempted to build skyships twice in the same phase of play"
    );
    return INVALID_MOVE;
  }

  const cost = 2 * G.playerInfo[playerID].shipyards;

  removeOneCounsellor(G, playerID);
  removeGoldAmount(G, playerID, cost);
  for (let i = 0; i < cost; i++) {
    addSkyship(G, playerID);
  }
  G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships = true;

  G.playerInfo[playerID].turnComplete = true;
};

export default buildSkyships;
