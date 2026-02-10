import { Move } from "boardgame.io";
import { MyGameState } from "../types";

// FIX: Removed broken imports (Ctx, EventsAPI, RandomAPI)

const pass: Move<MyGameState> = (
  {
    G,
    ctx,
    playerID,
    events,
    random,
  },
  ...args: any[]
) => {
  // Ensure player exists
  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].passed = true;
  }

  // Ensure events is defined (standard safety check)
  if (!events) return;

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