import { MoveDefinition, MyGameState, MoveError } from "../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { allPlayersPassed } from "../helpers/stateUtils";
import { setStage } from "../helpers/stageUtils";

const validatePass = (G: MyGameState, _playerID: string): MoveError | null => {
  // GAP-24: cascade flip — must keep discovering after Ocean/Legend; Land clears the flag
  // ctx isn't available in validate, but we can check the flag on G
  if (G.mustContinueDiscovery) {
    return { code: "MUST_CONTINUE", message: "You must continue discovering (Ocean/Legend tile flipped)" };
  }
  return null;
};

const pass: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args: any[]) => {
    const piracyIntent = args[0] as "tax" | "cut" | undefined;
    if (piracyIntent === "tax" || piracyIntent === "cut") {
      G.playerInfo[playerID].piracyIntent = piracyIntent;
    }
    G.playerInfo[playerID].passed = true;
    if (ctx.phase === "discovery") {
      G.firstTurnOfRound = false;
    }

    if (allPlayersPassed(G)) {
      // Dead code — next phase's onBegin overwrites. Set valid value for current context.
      if (ctx.phase === "actions") setStage(G, "actions", "default");
      else if (ctx.phase === "discovery") setStage(G, "discovery", "default");
      else setStage(G, "resolution", "retrieve_fleets");
      events.endPhase();
    } else {
      events.endTurn();
    }
  },
  errorMessage: "Cannot pass right now",
  validate: validatePass,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} passes`;
  },
};

export default pass;
