import { MoveDefinition, MyGameState, MoveError } from "../../types";
import { SKYSHIP_SELL_PRICE } from "../../codifiedGameInfo";

const validateSellSkyships = (G: MyGameState, playerID: string, amount: number): MoveError | null => {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { code: "INVALID_AMOUNT", message: "Must sell at least 1 Skyship" };
  }
  if (G.playerInfo[playerID].resources.skyships < amount) {
    return { code: "INSUFFICIENT_SKYSHIPS", message: `Not enough Skyships — have ${G.playerInfo[playerID].resources.skyships}` };
  }
  return null;
};

const sellSkyships: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const amount: number = args[0];
    G.playerInfo[playerID].resources.skyships -= amount;
    G.playerInfo[playerID].resources.gold += amount * SKYSHIP_SELL_PRICE;
  },
  errorMessage: "Cannot sell Skyships",
  validate: validateSellSkyships,
};

export default sellSkyships;
