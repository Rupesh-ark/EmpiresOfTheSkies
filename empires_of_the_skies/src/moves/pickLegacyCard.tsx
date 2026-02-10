import { Move } from "boardgame.io";
import { MyGameState } from "../types";

// Broken imports removed.
// The types for 'events' and 'random' are automatically provided by the Move<G> type.

const pickLegacyCard: Move<MyGameState> = (
  {
    G,
    ctx,
    playerID,
    events,
    random,
  },
  ...args: any[]
) => {
  const card = args[0];

  if (G.playerInfo[playerID]) {
    G.playerInfo[playerID].resources.legacyCard = card;
  }

  // Ensure events exists before calling (it is usually available in moves)
  if (events) {
    if (ctx.playOrderPos === ctx.numPlayers - 1) {
      events.endPhase();
    } else {
      events.endTurn();
    }
  }
};

export default pickLegacyCard;