import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

const coloniseLand: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  G.conquestState = {
    decision: "fight",
    ...G.playerInfo[playerID],
  };
  G.stage = "conquest draw or pick card";
};

export default coloniseLand;
