import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types";
import { logEvent } from "../../helpers/stateUtils";
import { applyBuyoff } from "../../helpers/resolveInvasion";

const offerBuyoffGold: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const amount: number = args[0];

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
  },
  errorMessage: "Cannot offer buy-off gold right now",
};

export default offerBuyoffGold;
