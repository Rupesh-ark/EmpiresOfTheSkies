import { MyGameState, MoveError, MoveDefinition } from "../../types.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation.js";
import { incrementActionsTaken } from "../../helpers/stateUtils.js";
import { MAX_FACTORIES } from "../../data/gameData.js";

const validateFoundFactory = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  if (G.playerInfo[playerID].factories >= MAX_FACTORIES) {
    return { code: "FACTORY_CAP_REACHED", message: `Already at maximum Factories (${MAX_FACTORIES})` };
  }

  return null;
};

const foundFactory: MoveDefinition = {
  fn: ({ G, playerID }) => {
    if (validateFoundFactory(G, playerID)) return INVALID_MOVE;

    const cost = 1 + G.boardState.foundFactories.length + 1;

    G.playerInfo[playerID].resources.gold -= cost;
    G.playerInfo[playerID].factories += 1;
    G.boardState.foundFactories.push(playerID);
    incrementActionsTaken(G, playerID);
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot found a Factory right now",
  validate: validateFoundFactory,
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].factories;
    return `${k} founds a Factory (now ${count})`;
  },
};

export default foundFactory;
