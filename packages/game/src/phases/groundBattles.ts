import type { PhaseConfig } from "boardgame.io";
import type { MyGameState } from "../types.js";
import { findNextGroundBattle } from "../helpers/findNext.js";
import { checkIfCurrentPlayerIsInCurrentBattle } from "../helpers/helpers.js";
import log from "../helpers/logger.js";
import { getResolutionTarget, setupNextDeferredBattle } from "../helpers/resolutionFlow.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

const firstFleetOwnerPosition = (G: MyGameState): number => {
  if (G.step !== "ground_attack_or_pass") return 0;
  const [x, y] = G.mapState.currentBattle;
  const owner = G.mapState.battleMap[y]?.[x]?.[0];
  const position = owner === undefined ? -1 : G.turnOrder.indexOf(owner);
  return position === -1 ? 0 : position;
};

const groundBattlesPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet(
    "attackPlayersBuilding",
    "doNotGroundAttack",
    "defendGroundAttack",
    "yieldToAttacker",
    "garrisonTroops",
    "drawCard",
    "pickCard",
    "relocateDefeatedFleet",
    "commitDeferredBattleCard",
    "contributeToRebellion",
    "acceptRebellionSupport",
    "commitOccupationBattleCard"
  ),
  next: "conquests",
  onBegin: (context) => {
    phaseLog.info({ round: context.G.round }, "ground-battles");
    context.G.mapState.currentBattle = [-1, 0];
    context.G.battleState = undefined;
    context.G.currentOccupationBattle = null;
    // Resolve all deferred battles before any map ground battle.
    if (!setupNextDeferredBattle(context.G, context.events, true)) {
      findNextGroundBattle(context.G, context.events, true);
    }
  },
  turn: {
    order: {
      playOrder: ({ G }) => G.turnOrder,
      first: ({ G }) => {
        const target = getResolutionTarget(G);
        if (target === null) return firstFleetOwnerPosition(G);
        const position = G.turnOrder.indexOf(target);
        return position === -1 ? 0 : position;
      },
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
    },
    onBegin: (context) => {
      if (
        context.G.step === "deferred_battle" ||
        context.G.step === "rebellion_rival_support" ||
        context.G.step === "rebellion_accept_support" ||
        context.G.step === "occupation_battle"
      ) {
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
