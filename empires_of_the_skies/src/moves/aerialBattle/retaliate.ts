import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

const retaliate: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  if (G.battleState) {
    G.battleState.defender = { decision: "fight", ...G.playerInfo[playerID] };
  }
};

export default retaliate;
