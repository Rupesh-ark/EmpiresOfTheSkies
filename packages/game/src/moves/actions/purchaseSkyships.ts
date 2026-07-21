import { MyGameState, MoveError, MoveDefinition } from "../../types.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation.js";
import {
  addSkyship,
  removeGoldAmount,
  incrementActionsTaken,
} from "../../helpers/stateUtils.js";
import { getNextSlotCost } from "../../helpers/actionCosts.js";

const validatePurchaseSkyships = (
  G: MyGameState,
  playerID: string,
  republic: "zeeland" | "venoa"
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  if (republic !== "zeeland" && republic !== "venoa") {
    return {
      code: "INVALID_REPUBLIC",
      message: `Invalid republic: ${republic}. Must be 'zeeland' or 'venoa'.`,
    };
  }

  return null;
};

const purchaseSkyships: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const republic: "zeeland" | "venoa" = args[0];
    if (validatePurchaseSkyships(G, playerID, republic)) return INVALID_MOVE;

    const boardSlots =
      republic === "venoa"
        ? G.boardState.purchaseSkyshipsVenoa
        : G.boardState.purchaseSkyshipsZeeland;

    const cost = getNextSlotCost(
      G,
      republic === "venoa" ? "purchaseSkyshipsVenoa" : "purchaseSkyshipsZeeland"
    );

    incrementActionsTaken(G, playerID);
    removeGoldAmount(G, playerID, cost);
    addSkyship(G, playerID);
    addSkyship(G, playerID);
    boardSlots.push(playerID);
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot purchase Skyships right now",
  validate: validatePurchaseSkyships,
  successLog: (G, pid, republic) => {
    const k = G.playerInfo[pid].kingdomName;
    const count = G.playerInfo[pid].resources.skyships;
    const republicName = republic === "venoa" ? "Venoa" : "Zeeland";
    return `${k} purchases Skyships from ${republicName} (now ${count})`;
  },
};

export default purchaseSkyships;
