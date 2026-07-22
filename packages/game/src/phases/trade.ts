import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { tradePhaseEffects } from "../helpers/resolveRound.js";
import log from "../helpers/logger.js";

const phaseLog = log.child({ mod: "phase" });

const tradePhase: PhaseConfig<MyGameState> = {
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "trade");
    tradePhaseEffects(context.G);
    context.events.endPhase();
  },
  moves: {},
  next: "sellGoods",
};

export default tradePhase;
