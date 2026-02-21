import { Move } from "boardgame.io";
import { MyGameState, PlayerColour } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addGoldAmount,
  removeGoldAmount,
  removeOneCounsellor,
} from "../resourceUpdates";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

export const influencePrelates: Move<MyGameState> = (
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
  const value: keyof typeof G.boardState.influencePrelates = args[0] + 1;

  if (checkCounsellorsNotZero(playerID, G) !== undefined) {
    return INVALID_MOVE;
  }

  if (G.boardState.influencePrelates[value] !== undefined) {
    console.log("Player has selected a move which has already been taken");
    return INVALID_MOVE;
  }
  let recipientOfPayment;
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
    if (playerInfo.colour === kingdomToIDMap[value]) {
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
