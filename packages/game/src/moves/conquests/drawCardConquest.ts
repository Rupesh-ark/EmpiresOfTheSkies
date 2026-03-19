import { MoveDefinition } from "../../types";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { resolveConquest } from "../../helpers/resolveBattle";

// No-effect cards are handled by drawFortuneOfWarCard (reshuffle + redraw).
const drawCardConquest: MoveDefinition = {
  fn: ({ G, ctx, events, random }, ...args) => {
    if (G.conquestState) {
      G.conquestState.fowCard = drawFortuneOfWarCard(G, random.Shuffle);
    }

    resolveConquest(G, events, ctx, random);
  },
  errorMessage: "Cannot draw a conquest card right now",
};

export default drawCardConquest;
