import { Move } from "boardgame.io";
import { MyGameState, MoveError } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";
import { removeOneCounsellor } from "../../helpers/stateUtils";
import { MAX_FACTORIES } from "../../codifiedGameInfo";

export const validateFoundFactory = (
  G: MyGameState,
  playerID: string,
  slotIndex: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  if (G.playerInfo[playerID].factories >= MAX_FACTORIES) {
    return { code: "FACTORY_CAP_REACHED", message: `Already at maximum Factories (${MAX_FACTORIES})` };
  }

  const slot: keyof typeof G.boardState.foundFactories = (slotIndex + 1) as 1 | 2 | 3 | 4;
  if (G.boardState.foundFactories[slot] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Factory slot is already taken" };
  }

  return null;
};

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