import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { drawFortuneOfWarCard } from "../../helpers/helpers";
import { resolveConquest } from "../../helpers/resolveBattle";

//TODO: add possibility to draw a no effect card from the deck
const drawCardConquest: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  if (G.conquestState) {
    G.conquestState.fowCard = drawFortuneOfWarCard(G);
  }

  resolveConquest(G, events, ctx, random);
};

export default drawCardConquest;
