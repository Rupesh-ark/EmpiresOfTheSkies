import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { sellGoodsPhaseEffects } from "../helpers/resolveRound.js";
import log from "../helpers/logger.js";

const phaseLog = log.child({ mod: "phase" });

export const sellGoodsPhase: PhaseConfig<MyGameState> = {
  onBegin: (context) => {
    if (context.G._halted) return;
    phaseLog.info({ round: context.G.round }, "sell-goods");
    sellGoodsPhaseEffects(context.G, context.random);
    context.events.endPhase();
  },
  moves: {},
  next: "piracy",
};

export default sellGoodsPhase;
