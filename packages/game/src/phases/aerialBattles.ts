import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { findNextBattle } from "../helpers/findNext.js";
import {
  checkIfCurrentPlayerIsInCurrentBattle,
  sortPlayersInPlayerOrder,
} from "../helpers/helpers.js";
import log from "../helpers/logger.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

const firstAttackerPosition = (G: MyGameState): number => {
  if (G.step !== "aerial_attack_or_pass") return 0;
  const [x, y] = G.mapState.currentBattle;
  const attacker = sortPlayersInPlayerOrder(
    [...(G.mapState.battleMap[y]?.[x] ?? [])],
    G
  )[0];
  const position = attacker === undefined ? -1 : G.turnOrder.indexOf(attacker);
  return position === -1 ? 0 : position;
};

export const aerialBattlesPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet(
    "doNotAttack",
    "attackOtherPlayersFleet",
    "retaliate",
    "evadeAttackingFleet",
    "drawCard",
    "pickCard",
    "relocateDefeatedFleet"
  ),
  next: "plunder",
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "aerial-battles");
    context.G.mapState.currentBattle = [0, 0];
    context.G.battleState = undefined;
    findNextBattle(context.G, context.events, true);
  },
  turn: {
    order: {
      playOrder: ({ G }) => G.turnOrder,
      first: ({ G }) => firstAttackerPosition(G),
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

export default aerialBattlesPhase;
