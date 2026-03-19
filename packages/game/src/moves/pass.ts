import { MoveDefinition } from "../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { allPlayersPassed } from "../helpers/stateUtils";

const pass: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args: any[]) => {
    // GAP-24: cascade flip — must keep discovering after Ocean/Legend; Land clears the flag
    if (ctx.phase === "discovery" && G.mustContinueDiscovery) {
      return INVALID_MOVE;
    }
    G.playerInfo[playerID].passed = true;
    if (ctx.phase === "discovery") {
      G.firstTurnOfRound = false;
    }

    if (allPlayersPassed(G)) {
      G.stage = ctx.phase === "actions" ? "attack or pass" : "actions";
      events.endPhase();
    } else {
      events.endTurn();
    }
  },
  errorMessage: "Cannot pass right now",
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} passes`;
  },
};

export default pass;
