import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { checkCounsellorsNotZero } from "../moveValidation";
import { removeOneCounsellor } from "../../helpers/stateUtils";
import { MAX_FACTORIES } from "../../codifiedGameInfo";

const foundFactory: Move<MyGameState> = ({ G, playerID }, ...args) => {
  if (checkCounsellorsNotZero(playerID, G)) {
    return INVALID_MOVE;
  }

  if (G.playerInfo[playerID].factories >= MAX_FACTORIES) {
    return INVALID_MOVE;
  }

  const slot: keyof typeof G.boardState.foundFactories = args[0] + 1;
  if (G.boardState.foundFactories[slot] !== undefined) {
    return INVALID_MOVE;
  }

  const takenSlots = Object.values(G.boardState.foundFactories).filter(
    (v) => v !== undefined
  ).length;
  const cost = 1 + takenSlots;

  G.playerInfo[playerID].resources.gold -= cost;
  G.playerInfo[playerID].factories += 1;
  G.boardState.foundFactories[slot] = playerID;
  removeOneCounsellor(G, playerID);
  G.playerInfo[playerID].turnComplete = true;
};

export default foundFactory;