import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { validateBuildSkyships } from "../moveValidation";
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
  // GAP-20: player chooses 1 or 2 skyships per shipyard, pays 1 Gold each
  const perShipyard: number = args[0];
  if (validateBuildSkyships(G, playerID, perShipyard)) return INVALID_MOVE;
  const total = perShipyard * G.playerInfo[playerID].shipyards;

  removeOneCounsellor(G, playerID);
  removeGoldAmount(G, playerID, total);
  for (let i = 0; i < total; i++) {
    addSkyship(G, playerID);
  }
  G.playerInfo[playerID].playerBoardCounsellorLocations.buildSkyships = true;

  G.playerInfo[playerID].turnComplete = true;
};

export default buildSkyships;
