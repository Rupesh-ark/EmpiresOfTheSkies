import { Move } from "boardgame.io";
import { MyGameState } from "../types";
import { Ctx } from "boardgame.io/dist/types/src/types";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/plugin-events";
import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";
import { INVALID_MOVE } from "boardgame.io/core";

const pass: Move<MyGameState> = (
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
  // GAP-24: cascade flip — must keep discovering after Ocean/Legend; Land clears the flag
  if (ctx.phase === "discovery" && G.mustContinueDiscovery) {
    return INVALID_MOVE;
  }
  G.playerInfo[playerID].passed = true;
  if (ctx.phase === "discovery") {
    G.firstTurnOfRound = false;
    if (ctx.playOrderPos === ctx.numPlayers - 1) {
      G.stage = "actions";
      events.endPhase();
    } else {
      events.endTurn();
    }
  } else if (ctx.phase === "actions") {
    let readyToEndPhase = true;
    Object.values(G.playerInfo).forEach((info) => {
      if (info.passed === false) {
        readyToEndPhase = false;
      }
    });
    if (readyToEndPhase && ctx.phase === "actions") {
      G.stage = "attack or pass";
      events.endPhase();
    } else {
      events.endTurn();
    }
  }
};

export default pass;
