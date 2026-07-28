import { INVALID_MOVE } from "boardgame.io/core";
import type { MoveDefinition } from "../../types.js";
import { logEvent } from "../../helpers/stateUtils.js";
import {
  hasOfferedDefenderSupport,
  resolveRebellionWithTroopsAndRivals,
} from "../../helpers/resolveRebellion.js";
import { nextAfterRebellion } from "../../helpers/resolutionFlow.js";
import log from "../../helpers/logger.js";

const conLog = log.child({ mod: "contribute-rebellion" });
const MAX_RIVAL_TROOPS = 3;

const contributeToRebellion: MoveDefinition = {
  fn: ({ G, ctx, playerID, events, random }, ...args) => {
    const side: "defender" | "rebel" | "abstain" = args[0];
    const regiments: number = args[1];
    const levies: number = args[2];

    if (typeof levies !== "number" || isNaN(levies)) {
      conLog.warn({ levies }, "Invalid levies arg");
      return INVALID_MOVE;
    }
    if (typeof regiments !== "number" || isNaN(regiments)) {
      conLog.warn({ regiments }, "Invalid regiments arg");
      return INVALID_MOVE;
    }
    if (
      side !== "defender" &&
      side !== "rebel" &&
      side !== "abstain"
    ) {
      return INVALID_MOVE;
    }

    const rebellion = G.currentRebellion;
    if (!rebellion) return INVALID_MOVE;
    if (G.step !== "rebellion_rival_support") return INVALID_MOVE;
    if (rebellion.event.targetPlayerID === playerID) {
      return INVALID_MOVE;
    }
    if (!rebellion.rivalContributions) return INVALID_MOVE;
    if (
      rebellion.eligibleRivals &&
      !rebellion.eligibleRivals.includes(playerID)
    ) {
      return INVALID_MOVE;
    }

    const player = G.playerInfo[playerID];
    const isColonial =
      rebellion.event.card === "colonial_rebellion";

    if (isColonial) {
      const tile = rebellion.event.targetTile;
      if (!tile) return INVALID_MOVE;
      const [x, y] = tile;
      const fleets = player.fleetInfo.filter(
        (fleet) =>
          fleet.location[0] === x &&
          fleet.location[1] === y &&
          fleet.skyships > 0
      );
      if (fleets.length === 0) return INVALID_MOVE;

      const committed =
        side === "abstain"
          ? {
              regiments: 0,
              levies: 0,
              skyships: 0,
              eliteRegiments: 0,
            }
          : fleets.reduce(
              (total, fleet) => ({
                regiments: total.regiments + fleet.regiments,
                levies: total.levies + fleet.levies,
                skyships: total.skyships + fleet.skyships,
                eliteRegiments:
                  total.eliteRegiments + fleet.eliteRegiments,
              }),
              {
                regiments: 0,
                levies: 0,
                skyships: 0,
                eliteRegiments: 0,
              }
            );

      rebellion.rivalContributions[playerID] = {
        side: side === "abstain" ? "defender" : side,
        ...committed,
        source: "fleet",
      };
      logEvent(
        G,
        side === "abstain"
          ? `${player.kingdomName} stays out of the Colonial Rebellion`
          : `${player.kingdomName} commits every Fleet at the colony to the ${side}`
      );
    } else {
      if (regiments < 0 || levies < 0) return INVALID_MOVE;
      if (regiments + levies > MAX_RIVAL_TROOPS) {
        return INVALID_MOVE;
      }
      if (regiments > player.resources.regiments) {
        return INVALID_MOVE;
      }
      if (levies > player.resources.levies) return INVALID_MOVE;

      const committedRegiments =
        side === "abstain" ? 0 : regiments;
      const committedLevies = side === "abstain" ? 0 : levies;
      rebellion.rivalContributions[playerID] = {
        side: side === "abstain" ? "defender" : side,
        regiments: committedRegiments,
        levies: committedLevies,
        skyships: 0,
        eliteRegiments: 0,
        source: "kingdom",
      };
      player.resources.regiments -= committedRegiments;
      player.resources.levies -= committedLevies;

      logEvent(
        G,
        committedRegiments + committedLevies > 0
          ? `${player.kingdomName} sends ${committedRegiments}R/${committedLevies}L to support the ${side}`
          : `${player.kingdomName} stays out of the rebellion`
      );
    }

    const targetID = rebellion.event.targetPlayerID;
    const eligibleRivals =
      rebellion.eligibleRivals ??
      ctx.playOrder.filter((id) => id !== targetID);
    const allRivalsContributed = eligibleRivals.every(
      (id) => rebellion.rivalContributions![id] !== undefined
    );

    if (allRivalsContributed) {
      if (hasOfferedDefenderSupport(rebellion)) {
        G.step = "rebellion_accept_support";
        events.endTurn({ next: targetID });
      } else if (isColonial) {
        G.step = "deferred_battle";
        events.endTurn({ next: targetID });
      } else {
        resolveRebellionWithTroopsAndRivals(
          G,
          rebellion,
          random.Shuffle
        );
        G.currentRebellion = null;
        nextAfterRebellion(G, events);
      }
      return;
    }

    const nextRival = eligibleRivals.find(
      (id) => !rebellion.rivalContributions![id]
    );
    if (nextRival) {
      events.endTurn({ next: nextRival });
    }
  },
  errorMessage: "Cannot contribute to the rebellion right now",
};

export default contributeToRebellion;
