import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { getResolutionTarget } from "../helpers/resolutionFlow.js";
import { setupNextRebellion } from "../helpers/resolveRebellion.js";
import log from "../helpers/logger.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

export const rebellionsPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet("commitRebellionTroops", "contributeToRebellion"),
  next: "aerialBattles",
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "rebellions");
    if (setupNextRebellion(context.G)) {
      context.G.step = "rebellion";
    } else {
      context.events.endPhase();
    }
  },
  turn: {
    order: {
      playOrder: ({ G }) => G.turnOrder,
      first: ({ G }) => {
        const target = getResolutionTarget(G);
        if (target === null) return 0;
        const position = G.turnOrder.indexOf(target);
        return position === -1 ? 0 : position;
      },
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
    },
    onBegin: (context) => {
      if (context.G.step === "rebellion_rival_support") return;

      const target = getResolutionTarget(context.G);
      if (target && target !== context.ctx.currentPlayer) {
        context.events.endTurn({ next: target });
      }
    },
  },
};

export default rebellionsPhase;
