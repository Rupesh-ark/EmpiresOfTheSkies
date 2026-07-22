import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { findNextPlunder } from "../helpers/findNext.js";
import { checkIfCurrentPlayerIsInCurrentBattle } from "../helpers/helpers.js";
import log from "../helpers/logger.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

const firstFleetOwnerPosition = (G: MyGameState): number => {
  if (G.step !== "plunder_legends") return 0;
  const [x, y] = G.mapState.currentBattle;
  const owner = G.mapState.battleMap[y]?.[x]?.[0];
  const position = owner === undefined ? -1 : G.turnOrder.indexOf(owner);
  return position === -1 ? 0 : position;
};

const plunderPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet("plunder", "doNotPlunder"),
  next: "groundBattles",
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "plunder");
    context.G.mapState.currentBattle = [0, 0];
    context.G.battleState = undefined;
    findNextPlunder(context.G, context.events, true);
  },
  turn: {
    order: {
      playOrder: ({ G }) => G.turnOrder,
      first: ({ G }) => firstFleetOwnerPosition(G),
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
    },
    onBegin: (context) => {
      checkIfCurrentPlayerIsInCurrentBattle(
        context.G,
        context.ctx,
        context.events
      );
    },
  },
};

export default plunderPhase;
