import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { factoryIncomePhaseEffects } from "../helpers/resolveRound.js";
import log from "../helpers/logger.js";

const phaseLog = log.child({ mod: "phase" });

export const factoryIncomePhase: PhaseConfig<MyGameState> = {
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "factory-income");
    factoryIncomePhaseEffects(context.G);
    context.events.endPhase();
  },
  moves: {},
  next: "election",
};

export default factoryIncomePhase;
