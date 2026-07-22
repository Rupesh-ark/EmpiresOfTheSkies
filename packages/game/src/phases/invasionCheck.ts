import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { getResolutionTarget, runInvasionCheck } from "../helpers/resolutionFlow.js";
import { prepareInfidelFleetCombat } from "../helpers/resolveInfidelFleet.js";
import log from "../helpers/logger.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

export const invasionCheckPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet(
    "respondToInfidelFleet",
    "nominateCaptainGeneral",
    "contributeToGrandArmy",
    "offerBuyoffGold"
  ),
  next: "retrieveFleets",
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "invasion-check");
    if (prepareInfidelFleetCombat(context.G)) {
      context.G.step = "infidel_fleet_combat";
    } else {
      runInvasionCheck(context.G, context.events, true);
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
      const sub = context.G.step;
      if (sub === "invasion_contribute" || sub === "invasion_buyoff") return;

      const target = getResolutionTarget(context.G);
      if (target && target !== context.ctx.currentPlayer) {
        context.events.endTurn({ next: target });
      }
    },
  },
};

export default invasionCheckPhase;
