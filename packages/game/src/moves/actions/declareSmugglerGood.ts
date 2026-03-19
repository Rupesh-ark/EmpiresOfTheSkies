import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition, GoodKey } from "../../types";

// GAP-9: licenced_smugglers KA — player declares which good they want +1 of at trade time
const declareSmugglerGood: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const good: GoodKey = args[0];
    if (G.playerInfo[playerID].resources.advantageCard !== "licenced_smugglers") {
      return INVALID_MOVE;
    }
    G.playerInfo[playerID].resources.smugglerGoodChoice = good;
  },
  errorMessage: "Cannot declare a smuggler good",
};

export default declareSmugglerGood;
