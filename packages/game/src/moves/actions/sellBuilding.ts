import { MyGameState, MoveDefinition, MoveError } from "../../types";
import { BUILDING_SELL_PRICE } from "../../data/gameData";

const validateSellBuilding = (G: MyGameState, playerID: string, buildingType: string): MoveError | null => {
  const player = G.playerInfo[playerID];
  if (buildingType === "cathedral") {
    if (player.hereticOrOrthodox !== "heretic")
      return { code: "NOT_HERETIC", message: "Only heretics can sell cathedrals" };
    if (player.cathedrals <= 0)
      return { code: "NO_CATHEDRALS", message: "No cathedrals to sell" };
  } else if (buildingType === "palace") {
    if (player.palaces <= 1)
      return { code: "LAST_PALACE", message: "Cannot sell your last palace" };
  } else {
    return { code: "INVALID_TYPE", message: "Invalid building type" };
  }
  return null;
};

const sellBuilding: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const buildingType: "cathedral" | "palace" = args[0];
    const player = G.playerInfo[playerID];

    if (buildingType === "cathedral") {
      player.cathedrals -= 1;
    } else {
      player.palaces -= 1;
    }
    player.resources.gold += BUILDING_SELL_PRICE;
  },
  errorMessage: "Cannot sell this building",
  validate: validateSellBuilding,
};

export default sellBuilding;
