import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState } from "../../types";
import { logEvent } from "../../helpers/stateUtils";
import { resolveDeferredBattleInteractive } from "../../helpers/resolveDeferredBattles";
import { setupNextDeferredBattle } from "../../helpers/resolutionFlow";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { Ctx } from "boardgame.io/dist/types/src/types";

/**
 * Move called by the target player of a deferred battle event
 * to optionally play a FoW card from hand before resolution.
 * Pass fowCardIndex = undefined to use a deck draw instead.
 */
const commitDeferredBattleCard: Move<MyGameState> = (
  { G, ctx, playerID, events, random }: {
    G: MyGameState;
    ctx: Ctx;
    playerID: string;
    events: EventsAPI;
    random: any;
  },
  fowCardIndex?: number
) => {
  const battle = G.currentDeferredBattle;
  if (!battle) return INVALID_MOVE;
  if (battle.event.targetPlayerID !== playerID) return INVALID_MOVE;

  const player = G.playerInfo[playerID];

  // Pull FoW card from hand if provided
  let fowCard: { sword: number; shield: number } | undefined;
  if (
    fowCardIndex !== undefined &&
    fowCardIndex >= 0 &&
    fowCardIndex < player.resources.fortuneCards.length
  ) {
    const card = player.resources.fortuneCards.splice(fowCardIndex, 1)[0];
    fowCard = { sword: card.sword, shield: card.shield };
    logEvent(G, `${player.kingdomName} plays Fortune of War card: ${card.sword}S/${card.shield}Sh`);
  }

  // Resolve the battle with the player's chosen card
  resolveDeferredBattleInteractive(G, battle.event, random.Shuffle, fowCard);
  G.currentDeferredBattle = null;

  // Check for next deferred battle or continue resolution
  setupNextDeferredBattle(G, events);
};

export default commitDeferredBattleCard;
