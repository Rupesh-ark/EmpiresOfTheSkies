import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { piracyPhaseEffects } from "../helpers/resolveRound.js";
import log from "../helpers/logger.js";

const phaseLog = log.child({ mod: "phase" });

export const piracyPhase: PhaseConfig<MyGameState> = {
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "piracy");
    piracyPhaseEffects(context.G);
    context.events.endPhase();
  },
  moves: {},
  next: "factoryIncome",
};

export default piracyPhase;
