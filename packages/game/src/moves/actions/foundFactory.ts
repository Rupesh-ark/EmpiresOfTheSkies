import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateFoundFactory } from "../moveValidation";
import { removeOneCounsellor } from "../../helpers/stateUtils";

const foundFactory: Move<MyGameState> = ({ G, playerID }, ...args) => {
  if (validateFoundFactory(G, playerID, args[0])) return INVALID_MOVE;

  const slot: keyof typeof G.boardState.foundFactories = args[0] + 1;

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