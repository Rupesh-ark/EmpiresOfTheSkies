import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { MyGameState, GoodKey } from "../../types";

// GAP-9: licenced_smugglers KA — player declares which good they want +1 of at trade time
const declareSmugglerGood: Move<MyGameState> = (
  { G, playerID }: { G: MyGameState; playerID: string },
  good: GoodKey
) => {
  if (G.playerInfo[playerID].resources.advantageCard !== "licenced_smugglers") {
    return INVALID_MOVE;
  }
  G.playerInfo[playerID].resources.smugglerGoodChoice = good;
};

export default declareSmugglerGood;
