import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState } from "../../types";
import { logEvent } from "../../helpers/stateUtils";
import { resolveGrandArmyBattle } from "../../helpers/resolveInvasion";
import { checkForInvasion } from "../../helpers/resolveInvasion";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { Ctx } from "boardgame.io/dist/types/src/types";

/**
 * Move called by each player in IPO order to contribute troops
 * to the Grand Army of the Faith. Zero is a valid choice (but
 * triggers heresy shame penalty after battle).
 *
 * TODO: Also allow fleet contribution.
 */
const contributeToGrandArmy: Move<MyGameState> = (
  { G, ctx, playerID, events }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
  },
  regiments: number,
  levies: number
) => {
  if (!G.currentInvasion) return INVALID_MOVE;
  if (G.currentInvasion.phase !== "contribute") return INVALID_MOVE;

  const player = G.playerInfo[playerID];

  // Validate
  if (regiments < 0 || levies < 0) return INVALID_MOVE;
  if (regiments > player.resources.regiments) return INVALID_MOVE;
  if (levies > player.resources.levies) return INVALID_MOVE;

  // Record contribution
  G.currentInvasion.contributions[playerID] = { regiments, levies };

  const totalSwords = regiments * 2 + levies;
  logEvent(
    G,
    `${player.kingdomName} contributes ${regiments} regiments, ${levies} levies (${totalSwords} swords) to the Grand Army`
  );

  // Check if all players have contributed
  const allContributed = ctx.playOrder.every(
    (id) => G.currentInvasion!.contributions[id] !== undefined
  );

  if (allContributed) {
    // Resolve the battle — returns buyoff cost (0 if won)
    const buyoffCost = resolveGrandArmyBattle(G);

    if (buyoffCost > 0 && G.currentInvasion) {
      // Army lost — transition to interactive buyoff
      G.currentInvasion.phase = "buyoff";
      G.currentInvasion.buyoffCost = buyoffCost;
      G.currentInvasion.buyoffOffered = {};
      G.stage = "invasion_buyoff";
      events.endTurn({ next: ctx.playOrder[0] });
    } else {
      // Army won — proceed to retrieve fleets
      G.stage = "retrieve fleets";
      events.endTurn();
    }
  } else {
    // Next player in IPO who hasn't contributed yet
    const nextPlayer = ctx.playOrder.find(
      (id) => G.currentInvasion!.contributions[id] === undefined
    );
    if (nextPlayer) {
      events.endTurn({ next: nextPlayer });
    }
  }
};

export default contributeToGrandArmy;
