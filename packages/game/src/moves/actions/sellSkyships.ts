import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { SKYSHIP_SELL_PRICE } from "../../codifiedGameInfo";

const sellSkyships: Move<MyGameState> = ({ G, playerID }, ...args: any[]) => {
  const amount: number = args[0];

  if (!Number.isInteger(amount) || amount <= 0) {
    return INVALID_MOVE;
  }

  if (G.playerInfo[playerID].resources.skyships < amount) {
    return INVALID_MOVE;
  }

  G.playerInfo[playerID].resources.skyships -= amount;
  G.playerInfo[playerID].resources.gold += amount * SKYSHIP_SELL_PRICE;
};

export default sellSkyships;
