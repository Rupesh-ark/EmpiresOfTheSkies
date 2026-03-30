import { Ctx, Move } from "boardgame.io";
import { MyGameState } from "../types";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";

const pickLegacyCard: Move<MyGameState> = (
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
  const card = args[0];

  G.playerInfo[playerID].resources.legacyCard = card;

  if (ctx.playOrderPos === ctx.numPlayers - 1) {
    events.endPhase();
  } else {
    events.endTurn();
  }
};

export default pickLegacyCard;
