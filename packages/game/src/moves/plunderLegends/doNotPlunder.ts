import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { findNextPlunder } from "../../helpers/findNext";

const doNotPlunder: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  console.log("about to find the next plunder or move to the next phase");
  findNextPlunder(G, events);
};

export default doNotPlunder;
