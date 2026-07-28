import { MoveDefinition } from "../../types.js";
import { drawFortuneOfWarCard } from "../../helpers/helpers.js";
import { resolveConquest } from "../../helpers/resolveBattle.js";

// eots42:636 — battle No Effect cards reshuffle but do not redraw.
const drawCardConquest: MoveDefinition = {
  fn: ({ G, ctx, events, random }, ...args) => {
    if (G.conquestState) {
      G.conquestState.fowCard = drawFortuneOfWarCard(G, random.Shuffle, {
        redrawNoEffect: false,
      });
      G.conquestState.fowSource = "deck";
    }

    resolveConquest(G, events, ctx, random);
  },
  errorMessage: "Cannot draw a conquest card right now",
};

export default drawCardConquest;
