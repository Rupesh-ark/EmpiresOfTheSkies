import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";
import {
  addLevyAmount,
  removeOneCounsellor,
  removeVPAmount,
} from "../../helpers/stateUtils";
import { MAX_LEVIES, LEVY_GROUP_SIZE } from "../../codifiedGameInfo";

const conscriptLevies: Move<MyGameState> = ({ G, playerID }, ...args: any[]) => {
  if (G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies) {
    console.log("Player has attempted to conscript levies twice in the same phase of play");
    return INVALID_MOVE;
  }

  if (validateMove(playerID, G, { costsCounsellor: true })) return INVALID_MOVE;

  const levyAmount: number = args[0];

  if (levyAmount <= 0) {
    return INVALID_MOVE;
  }

  // B4: enforce MAX_LEVIES cap
  if (G.playerInfo[playerID].resources.levies + levyAmount > MAX_LEVIES) {
    return INVALID_MOVE;
  }

  // B4: ceil so a partial final group still costs 1 VP
  const cost = Math.ceil(levyAmount / LEVY_GROUP_SIZE);
  removeOneCounsellor(G, playerID);
  removeVPAmount(G, playerID, cost);
  addLevyAmount(G, playerID, levyAmount);
  G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default conscriptLevies;