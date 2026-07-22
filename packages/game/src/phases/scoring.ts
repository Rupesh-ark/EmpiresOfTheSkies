import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { scoringPhaseEffects } from "../helpers/resolveRound.js";
import log from "../helpers/logger.js";

const phaseLog = log.child({ mod: "phase" });

const scoringPhase: PhaseConfig<MyGameState> = {
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "scoring");
    scoringPhaseEffects(context.G, context.events);
    context.events.endPhase();
  },
  moves: {},
  next: "reset",
};

export default scoringPhase;
