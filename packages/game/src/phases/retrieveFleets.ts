import type { PhaseConfig } from "boardgame.io";
import type { MyGameState, PlayerInfo } from "../types.js";
import log from "../helpers/logger.js";
import resolveRound from "../helpers/resolveRound.js";
import { setStage } from "../helpers/stageUtils.js";
import { allPlayersPassed, nextUnpassedPlayer } from "../helpers/stateUtils.js";
import { wrapSet } from "../helpers/wrapSet.js";

const phaseLog = log.child({ mod: "phase" });

export const hasRetrievableFleet = (player: PlayerInfo): boolean =>
  player.fleetInfo.some(
    (fleet) => fleet.skyships > 0 && (fleet.location[0] !== 4 || fleet.location[1] !== 0)
  );

export const retrieveFleetsPhase: PhaseConfig<MyGameState> = {
  moves: wrapSet("retrieveFleets", "pass"),
  next: "reset",
  onBegin: (context) => {
    if (context.G._halted) return;
    phaseLog.info({ round: context.G.round }, "retrieve-fleets");
    Object.values(context.G.playerInfo).forEach((player) => {
      player.passed = false;
    });
    setStage(context.G, "resolution", "retrieve_fleets");
    if (!Object.values(context.G.playerInfo).some(hasRetrievableFleet)) {
      context.events.endPhase();
    }
  },
  turn: {
    order: {
      playOrder: ({ G }) => G.turnOrder,
      first: ({ G }) => {
        const index = G.turnOrder.findIndex((playerID) =>
          hasRetrievableFleet(G.playerInfo[playerID])
        );
        return index === -1 ? 0 : index;
      },
      next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.playOrder.length,
    },
    onBegin: (context) => {
      if (context.G._halted) return;
      const playerID = context.ctx.currentPlayer;
      const player = context.G.playerInfo[playerID];
      const hasRetrievableFleets = hasRetrievableFleet(player);
      if (!hasRetrievableFleets || player.passed) {
        player.passed = true;
        if (allPlayersPassed(context.G)) {
          context.events.endPhase();
        } else {
          const next = nextUnpassedPlayer(context.G, context.ctx.currentPlayer);
          context.events.endTurn(next ? { next } : undefined);
        }
      }
    },
  },
  onEnd: (context) => {
    resolveRound(context.G, context.events, context.random);
  },
};

export default retrieveFleetsPhase;
