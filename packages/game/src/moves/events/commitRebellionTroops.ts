import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types.js";
import { logEvent } from "../../helpers/stateUtils.js";
import { setStage } from "../../helpers/stageUtils.js";
import {
  resolveRebellionWithTroops,
} from "../../helpers/resolveRebellion.js";
import { nextAfterRebellion } from "../../helpers/resolutionFlow.js";
import log from "../../helpers/logger.js";

const crLog = log.child({ mod: "commit-rebellion" });

const commitRebellionTroops: MoveDefinition = {
  fn: ({ G, ctx, playerID, events, random }, ...args) => {
    const regiments: number = args[0];
    const levies: number = args[1];
    const fowCardIndex: number | undefined = args[2];

    // Defensive: validate args are valid numbers
    if (typeof levies !== 'number' || isNaN(levies)) {
      crLog.warn({ levies }, "Invalid levies arg");
      return INVALID_MOVE;
    }
    if (typeof regiments !== 'number' || isNaN(regiments)) {
      crLog.warn({ regiments }, "Invalid regiments arg");
      return INVALID_MOVE;
    }

    const rebellion = G.currentRebellion;
    if (!rebellion) return INVALID_MOVE;
    if (rebellion.event.targetPlayerID !== playerID) return INVALID_MOVE;

    const player = G.playerInfo[playerID];

    // Validate player has enough troops
    if (regiments < 0 || levies < 0) return INVALID_MOVE;
    if (regiments > player.resources.regiments) return INVALID_MOVE;
    if (levies > player.resources.levies) return INVALID_MOVE;

    const kingdom = player.kingdomName;
    logEvent(
      G,
      `${kingdom} commits ${regiments} regiments and ${levies} levies against the rebellion`
    );

    // Pull FoW card from hand if provided
    if (
      fowCardIndex !== undefined &&
      fowCardIndex >= 0 &&
      fowCardIndex < player.resources.fortuneCards.length
    ) {
      const card = player.resources.fortuneCards.splice(fowCardIndex, 1)[0];
      rebellion.fowCard = { name: card.name, sword: card.sword, shield: card.shield };
      logEvent(G, `${kingdom} plays Fortune of War card: ${card.sword}S/${card.shield}Sh`);
    }

    // Store defender's commitment for the rival support stage
    rebellion.defenderRegiments = regiments;
    rebellion.defenderLevies = levies;
    rebellion.rivalContributions = {};

    // If only 1 player (no rivals), resolve immediately
    const rivals = ctx.playOrder.filter(
      (id) => id !== rebellion.event.targetPlayerID
    );
    if (rivals.length === 0) {
      resolveRebellionWithTroops(G, rebellion, regiments, levies, random.Shuffle);
      G.currentRebellion = null;

      nextAfterRebellion(G, events);
      return;
    }

    // Transition to rival support stage
    setStage(G, "resolution", "rebellion_rival_support");
    events.endTurn({ next: rivals[0] });
  },
  errorMessage: "Cannot commit rebellion troops right now",
};

export default commitRebellionTroops;
