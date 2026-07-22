import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types.js";
import { logEvent } from "../../helpers/stateUtils.js";
import { findNextGroundBattle } from "../../helpers/findNext.js";
import { resolveDeferredBattleInteractive } from "../../helpers/resolveDeferredBattles.js";
import { setupNextDeferredBattle } from "../../helpers/resolutionFlow.js";

const commitDeferredBattleCard: MoveDefinition = {
  fn: ({ G, playerID, events, random }, ...args) => {
    const fowCardIndex: number | undefined = args[0];
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

    if (!setupNextDeferredBattle(G, events)) {
      findNextGroundBattle(G, events);
    }
  },
  errorMessage: "Cannot commit a battle card right now",
};

export default commitDeferredBattleCard;
