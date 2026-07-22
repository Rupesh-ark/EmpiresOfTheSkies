import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import log from "../helpers/logger.js";
import { advanceFromElection, getResolutionTarget } from "../helpers/resolutionFlow.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

export const postElectionPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet(
    "respondToInfidelFleet",
    "commitDeferredBattleCard",
    "commitRebellionTroops",
    "contributeToRebellion",
    "nominateCaptainGeneral",
    "contributeToGrandArmy",
    "offerBuyoffGold"
  ),
  next: "retrieveFleets",
  onBegin: (context) => {
    if (context.G._halted) return;
    phaseLog.info({ round: context.G.round }, "post-election");
    advanceFromElection(context.G, context.events, true);
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
      if (context.G._halted) return;
      const sub = context.G.stage.sub;

      if (sub === "rebellion_rival_support"
          || sub === "invasion_contribute" || sub === "invasion_buyoff") return;

      const target = getResolutionTarget(context.G);
      if (target && target !== context.ctx.currentPlayer) {
        context.events.endTurn({ next: target });
      }
    },
  },
};

export default postElectionPhase;
