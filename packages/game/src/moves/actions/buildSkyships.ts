import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addSkyship,
  removeGoldAmount,
  removeOneCounsellor,
} from "../../helpers/stateUtils";
const buildSkyships: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  if (validateMove(playerID, G, { costsCounsellor: true, costsGold: true })) return INVALID_MOVE;

  if (G.playerInfo[playerID].shipyards === 0) {
    return INVALID_MOVE;
  }

  if (
    G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships === true
  ) {
    return INVALID_MOVE;
  }

  // GAP-20: player chooses 1 or 2 skyships per shipyard, pays 1 Gold each
  const perShipyard: number = args[0];
  if (perShipyard !== 1 && perShipyard !== 2) {
    return INVALID_MOVE;
  }
  const total = perShipyard * G.playerInfo[playerID].shipyards;

  if (G.playerInfo[playerID].resources.gold < total) {
    return INVALID_MOVE;
  }

  removeOneCounsellor(G, playerID);
  removeGoldAmount(G, playerID, total);
  for (let i = 0; i < total; i++) {
    addSkyship(G, playerID);
  }
  G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships = true;

  G.playerInfo[playerID].turnComplete = true;
};

export default buildSkyships;
