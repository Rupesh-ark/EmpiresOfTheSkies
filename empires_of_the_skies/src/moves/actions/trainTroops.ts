import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { checkCounsellorsNotZero } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { removeGoldAmount, removeOneCounsellor } from "../resourceUpdates";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { Ctx } from "boardgame.io/dist/types/src/types";

const trainTroops: Move<MyGameState> = (
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
  const value: keyof typeof G.boardState.trainTroops = args[0] + 1;

  if (G.boardState.trainTroops[value] !== undefined) {
    console.log("Player has selected a move which has already been taken.");
    return INVALID_MOVE;
  }
  for (let i = 0; i < value; i++) {
    const card = drawFortuneOfWarCard(G);

    G.playerInfo[playerID].resources.fortuneCards.push({
      ...card,
      flipped: false,
    });
  }
  removeOneCounsellor(G, playerID);
  if (value === 2) {
    removeGoldAmount(G, playerID, 1);
  }
  G.boardState.trainTroops[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default trainTroops;
