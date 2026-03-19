import { MyGameState, MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { BUILDING_SELL_PRICE } from "../../codifiedGameInfo";

const sellBuilding: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const buildingType: "cathedral" | "palace" = args[0];
    const player = G.playerInfo[playerID];

    if (buildingType === "cathedral") {
      if (player.hereticOrOrthodox !== "heretic") {
        return INVALID_MOVE;
      }
      if (player.cathedrals <= 0) {
        return INVALID_MOVE;
      }
      player.cathedrals -= 1;
      player.resources.gold += BUILDING_SELL_PRICE;
    } else if (buildingType === "palace") {
      if (player.palaces <= 1) {
        return INVALID_MOVE;
      }
      player.palaces -= 1;
      player.resources.gold += BUILDING_SELL_PRICE;
    } else {
      return INVALID_MOVE;
    }
  },
  errorMessage: "Cannot sell this building",
  validate: (G, playerID, buildingType) => {
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
  },
};

export default sellBuilding;
