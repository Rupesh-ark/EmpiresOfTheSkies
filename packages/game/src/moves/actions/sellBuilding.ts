import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { BUILDING_SELL_PRICE } from "../../codifiedGameInfo";

const sellBuilding: Move<MyGameState> = ({ G, playerID }, ...args: any[]) => {
  const buildingType: "cathedral" | "palace" = args[0];
  const player = G.playerInfo[playerID];

  if (buildingType === "cathedral") {
    // Only heretics can sell cathedrals
    if (player.hereticOrOrthodox !== "heretic") {
      console.log("Only heretics can sell cathedrals");
      return INVALID_MOVE;
    }
    if (player.cathedrals <= 0) {
      console.log("Player has no cathedrals to sell");
      return INVALID_MOVE;
    }
    player.cathedrals -= 1;
    player.resources.gold += BUILDING_SELL_PRICE;
  } else if (buildingType === "palace") {
    // Cannot sell last palace
    if (player.palaces <= 1) {
      console.log("Cannot sell last palace");
      return INVALID_MOVE;
    }
    player.palaces -= 1;
    player.resources.gold += BUILDING_SELL_PRICE;
  } else {
    return INVALID_MOVE;
  }
};

export default sellBuilding;
