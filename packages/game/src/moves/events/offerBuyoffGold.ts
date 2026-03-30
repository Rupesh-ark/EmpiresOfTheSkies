import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState } from "../../types";
import { logEvent } from "../../helpers/stateUtils";
import { applyBuyoff } from "../../helpers/resolveInvasion";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { Ctx } from "boardgame.io/dist/types/src/types";

/**
 * Move called by each player in IPO order to offer gold for the
 * Infidel buy-off after the Grand Army is defeated.
 * Offering 0 is valid but risks VP penalties from the shortfall.
 */
const offerBuyoffGold: Move<MyGameState> = (
  { G, ctx, playerID, events }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
  },
  amount: number
) => {
  const invasion = G.currentInvasion;
  if (!invasion) return INVALID_MOVE;
  if (invasion.phase !== "buyoff") return INVALID_MOVE;
  if (!invasion.buyoffOffered) return INVALID_MOVE;

  const player = G.playerInfo[playerID];

  // Validate: can't offer negative or more than available
  if (amount < 0) return INVALID_MOVE;
  if (amount > Math.max(0, player.resources.gold)) return INVALID_MOVE;

  // Record offer
  invasion.buyoffOffered[playerID] = amount;

  if (amount > 0) {
    logEvent(G, `${player.kingdomName} offers ${amount} Gold for the buy-off`);
  } else {
    logEvent(G, `${player.kingdomName} offers nothing`);
  }

  // Check if all players have offered
  const allOffered = ctx.playOrder.every(
    (id) => invasion.buyoffOffered![id] !== undefined
  );

  if (allOffered) {
    // Apply gold deductions and shortfall VP penalties
    applyBuyoff(G);

    // Proceed to retrieve fleets
    G.stage = "retrieve fleets";
    events.endTurn();
  } else {
    // Next player in IPO who hasn't offered
    const nextPlayer = ctx.playOrder.find(
      (id) => invasion.buyoffOffered![id] === undefined
    );
    if (nextPlayer) {
      events.endTurn({ next: nextPlayer });
    }
  }
};

export default offerBuyoffGold;
