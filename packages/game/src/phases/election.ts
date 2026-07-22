import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import log from "../helpers/logger.js";
import { setStage } from "../helpers/stageUtils.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

export const electionPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet("vote"),
  next: "invasionCheck",
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "election");
    context.G.electionResults = {};
    context.G.hasVoted = [];
    context.G.voteSubmitted = {};
    setStage(context.G, "resolution", "election");
  },
  turn: {
    order: {
      playOrder: ({ G }) => G.turnOrder,
      first: () => 0,
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
    },
  },
};

export default electionPhase;
