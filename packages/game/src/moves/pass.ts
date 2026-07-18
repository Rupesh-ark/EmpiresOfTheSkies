import { MoveDefinition, MyGameState, MoveError } from "../types.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { allPlayersPassed } from "../helpers/stateUtils.js";
import { setStage } from "../helpers/stageUtils.js";

const validatePass = (G: MyGameState, _playerID: string): MoveError | null => {
  if (G.mustContinueDiscovery) {
    return { code: "MUST_CONTINUE", message: "You must continue discovering (Ocean/Legend tile flipped)" };
  }
  const phase = G.stage.phase;
  const sub = G.stage.sub;
  if (phase === "discovery" || phase === "actions" || sub === "retrieve_fleets") {
    return null;
  }
  return { code: "INVALID_PHASE", message: "Cannot pass in this stage" };
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
