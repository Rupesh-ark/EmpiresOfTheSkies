import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { resolveConquest } from "../../helpers/resolveBattle";

const pickCard: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const value = args[0];

  const card = G.playerInfo[playerID].resources.fortuneCards[value];

  if (G.conquestState) {
    G.conquestState.fowCard = card;
  }

  G.playerInfo[playerID].resources.fortuneCards.splice(value, 1);

  resolveConquest(G, events, ctx, random);
};

export default pickCard;
