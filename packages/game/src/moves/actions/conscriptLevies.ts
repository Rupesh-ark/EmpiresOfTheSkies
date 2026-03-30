import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateConscriptLevies } from "../moveValidation";
import {
  addLevyAmount,
  removeOneCounsellor,
  removeVPAmount,
} from "../../helpers/stateUtils";
import { LEVY_GROUP_SIZE } from "../../codifiedGameInfo";

const conscriptLevies: Move<MyGameState> = ({ G, playerID }, ...args: any[]) => {
  const levyAmount: number = args[0];

  // B4: enforce MAX_LEVIES cap
  if (validateConscriptLevies(G, playerID, levyAmount)) return INVALID_MOVE;

  // B4: ceil so a partial final group still costs 1 VP
  const cost = Math.ceil(levyAmount / LEVY_GROUP_SIZE);
  removeOneCounsellor(G, playerID);
  removeVPAmount(G, playerID, cost);
  addLevyAmount(G, playerID, levyAmount);
  G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default conscriptLevies;