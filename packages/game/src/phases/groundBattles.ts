import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { findNextGroundBattle } from "../helpers/findNext.js";
import { checkIfCurrentPlayerIsInCurrentBattle } from "../helpers/helpers.js";
import log from "../helpers/logger.js";
import { getResolutionTarget, setupNextDeferredBattle } from "../helpers/resolutionFlow.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

const firstFleetOwnerPosition = (G: MyGameState): number => {
  if (G.stage.sub !== "ground_attack_or_pass") return 0;
  const [x, y] = G.mapState.currentBattle;
  const owner = G.mapState.battleMap[y]?.[x]?.[0];
  const position = owner === undefined ? -1 : G.turnOrder.indexOf(owner);
  return position === -1 ? 0 : position;
};

export const groundBattlesPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet(
    "attackPlayersBuilding",
    "doNotGroundAttack",
    "defendGroundAttack",
    "yieldToAttacker",
    "garrisonTroops",
    "drawCard",
    "pickCard",
    "relocateDefeatedFleet",
    "commitDeferredBattleCard"
  ),
  next: "conquests",
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "ground-battles");
    context.G.mapState.currentBattle = [0, 0];
    context.G.battleState = undefined;
    // Resolve all deferred battles before any map ground battle.
    if (!setupNextDeferredBattle(context.G, context.events, true)) {
      findNextGroundBattle(context.G, context.events, true);
    }
  },
  turn: {
    order: {
      playOrder: ({ G }) => G.turnOrder,
      first: ({ G }) => {
        if (G.stage.sub !== "deferred_battle") return firstFleetOwnerPosition(G);
        const target = getResolutionTarget(G);
        if (target === null) return 0;
        const position = G.turnOrder.indexOf(target);
        return position === -1 ? 0 : position;
      },
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
    },
    onBegin: (context) => {
      if (context.G.stage.sub === "deferred_battle") {
        const target = getResolutionTarget(context.G);
        if (target && target !== context.ctx.currentPlayer) {
          context.events.endTurn({ next: target });
        }
        return;
      }
      checkIfCurrentPlayerIsInCurrentBattle(
        context.G,
        context.ctx,
        context.events
      );
    },
  },
};

export default groundBattlesPhase;
