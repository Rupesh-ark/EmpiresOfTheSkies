import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

import { findNextGroundBattle } from "../../helpers/findNext";

const doNotGroundAttack: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  findNextGroundBattle(G, events);
};

export default doNotGroundAttack;
