import { MoveDefinition, GoodKey, MyGameState, MoveError } from "../../types.js";

const validateDeclareSmugglerGood = (G: MyGameState, playerID: string): MoveError | null => {
  if (G.playerInfo[playerID].resources.advantageCard !== "licenced_smugglers") {
    return { code: "NO_SMUGGLER_CARD", message: "You don't have the Licensed Smugglers advantage" };
  }
  return null;
};

const declareSmugglerGood: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const good: GoodKey = args[0];
    G.playerInfo[playerID].resources.smugglerGoodChoice = good;
  },
  errorMessage: "Cannot declare a smuggler good",
  validate: validateDeclareSmugglerGood,
};

export default declareSmugglerGood;
