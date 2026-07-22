import { MoveDefinition, MyGameState, MoveError } from "../types.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { allPlayersPassed } from "../helpers/stateUtils.js";

const validatePass = (G: MyGameState, _playerID: string): MoveError | null => {
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
      if (ctx.phase === "actions" || ctx.phase === "discovery") G.step = "default";
      else G.step = "retrieve_fleets";
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
