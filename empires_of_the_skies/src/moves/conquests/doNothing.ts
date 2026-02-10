import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

import { findNextConquest } from "../../helpers/findNext";

const doNothing: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  findNextConquest(G, events);
};

export default doNothing;
