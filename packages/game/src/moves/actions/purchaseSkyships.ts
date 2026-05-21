import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";
import {
  addSkyship,
  removeGoldAmount,
  incrementActionsTaken,
} from "../../helpers/stateUtils";

const validatePurchaseSkyships = (
  G: MyGameState,
  playerID: string,
  _slotIndex: number,
  republic: "zeeland" | "venoa"
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  return null;
};

const purchaseSkyships: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const republic: "zeeland" | "venoa" = args[1];
    if (validatePurchaseSkyships(G, playerID, args[0], republic)) return INVALID_MOVE;

    const boardSlots =
      republic === "venoa"
        ? G.boardState.purchaseSkyshipsVenoa
        : G.boardState.purchaseSkyshipsZeeland;

    const cost = 2 + boardSlots.length + 1;

    incrementActionsTaken(G, playerID);
    removeGoldAmount(G, playerID, cost);
    addSkyship(G, playerID);
    addSkyship(G, playerID);
    boardSlots.push(playerID);
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot purchase Skyships right now",
  validate: validatePurchaseSkyships,
  successLog: (G, pid, _slot, republic) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].resources.skyships;
    return `${k} purchases Skyships from ${republic} (now ${count})`;
  },
};

export default purchaseSkyships;
