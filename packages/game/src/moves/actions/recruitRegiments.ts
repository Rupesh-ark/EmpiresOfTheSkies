import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { validateMove } from "../moveValidation";
import { INVALID_MOVE } from "boardgame.io/core";
import {
  addRegiments,
  removeGoldAmount,
  removeOneCounsellor,
} from "../../helpers/stateUtils";
import { RECRUIT_REGIMENTS_REWARD } from "../../codifiedGameInfo";
const recruitRegiments: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  if (validateMove(playerID, G, { costsCounsellor: true, costsGold: true })) return INVALID_MOVE;
  const value: keyof typeof G.boardState.recruitRegiments = args[0] + 1;
  if (G.boardState.recruitRegiments[value] !== undefined) {
    return INVALID_MOVE;
  }
  // v4.2: cost = 1 Gold + 1 Gold per counsellor in slot (including this one)
  // Slot position equals the count of counsellors, so cost = 1 + slot position
  const cost = 1 + value;
  removeOneCounsellor(G, playerID);
  removeGoldAmount(G, playerID, cost);
  // v4.2: always 4 regiments per action
  addRegiments(G, playerID, RECRUIT_REGIMENTS_REWARD);
  G.boardState.recruitRegiments[value] = playerID;
  G.playerInfo[playerID].turnComplete = true;
};

export default recruitRegiments;
