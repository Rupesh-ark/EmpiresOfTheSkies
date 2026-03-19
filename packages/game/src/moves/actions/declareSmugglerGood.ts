import { MoveDefinition, GoodKey, MyGameState, MoveError } from "../../types";

const validateDeclareSmugglerGood = (G: MyGameState, playerID: string): MoveError | null => {
  if (G.playerInfo[playerID].resources.advantageCard !== "licenced_smugglers") {
    return { code: "NO_SMUGGLER_CARD", message: "You don't have the Licensed Smugglers advantage" };
  }
  return null;
};

// GAP-9: licenced_smugglers KA — player declares which good they want +1 of at trade time
const declareSmugglerGood: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const good: GoodKey = args[0];
    G.playerInfo[playerID].resources.smugglerGoodChoice = good;
  },
  errorMessage: "Cannot declare a smuggler good",
  validate: validateDeclareSmugglerGood,
};

export default declareSmugglerGood;
