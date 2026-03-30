import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";
import {
  addSkyship,
  removeGoldAmount,
  removeOneCounsellor,
} from "../../helpers/stateUtils";

const validatePurchaseSkyships = (
  G: MyGameState,
  playerID: string,
  slotIndex: number,
  republic: "zeeland" | "venoa"
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  const boardSlots =
    republic === "venoa"
      ? G.boardState.purchaseSkyshipsVenoa
      : G.boardState.purchaseSkyshipsZeeland;

  const slot: keyof typeof boardSlots = (slotIndex + 1) as 1 | 2;

  if (boardSlots[slot] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That purchase slot is already taken" };
  }

  return null;
};

const purchaseSkyships: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const slotIndex: number = args[0];
    const republic: "zeeland" | "venoa" = args[1];
    if (validatePurchaseSkyships(G, playerID, slotIndex, republic)) return INVALID_MOVE;

    const boardSlots =
      republic === "venoa"
        ? G.boardState.purchaseSkyshipsVenoa
        : G.boardState.purchaseSkyshipsZeeland;

    const slot: keyof typeof boardSlots = (slotIndex + 1) as 1 | 2;

    // v4.2: cost = 2 Gold + 1 per counsellor in this slot including the one just placed
    // slot 1 (takenSlots=0): 2+1 = 3 Gold; slot 2 (takenSlots=1): 2+2 = 4 Gold
    const takenSlots = Object.values(boardSlots).filter(
      (v) => v !== undefined
    ).length;
    const cost = 2 + takenSlots + 1;

    removeOneCounsellor(G, playerID);
    removeGoldAmount(G, playerID, cost);
    addSkyship(G, playerID);
    addSkyship(G, playerID);
    boardSlots[slot] = playerID;
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
