import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { findNextConquest } from "../helpers/findNext.js";
import { checkIfCurrentPlayerIsInCurrentBattle } from "../helpers/helpers.js";
import log from "../helpers/logger.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

const firstFleetOwnerPosition = (G: MyGameState): number => {
  if (G.step !== "conquest") return 0;
  const [x, y] = G.mapState.currentBattle;
  const owner = G.mapState.battleMap[y]?.[x]?.[0];
  const position = owner === undefined ? -1 : G.turnOrder.indexOf(owner);
  return position === -1 ? 0 : position;
};

export const conquestsPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet(
    "coloniseLand",
    "constructOutpost",
    "doNothing",
    "drawCardConquest",
    "pickCardConquest",
    "garrisonTroops"
  ),
  next: "trade",
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "conquests");
    context.G.mapState.currentBattle = [0, 0];
    context.G.battleState = undefined;
    findNextConquest(context.G, context.events, true);
  },
  turn: {
    order: {
      playOrder: ({ G }) => G.turnOrder,
      first: ({ G }) => firstFleetOwnerPosition(G),
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
    },
    onBegin: (context) => {
      if (context.G.step === "conquest") return;
      checkIfCurrentPlayerIsInCurrentBattle(
        context.G,
        context.ctx,
        context.events
      );
    },
  },
};

export default conquestsPhase;
