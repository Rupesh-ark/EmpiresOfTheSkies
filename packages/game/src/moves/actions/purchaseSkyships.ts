import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { checkCounsellorsNotZero } from "../moveValidation";
import {
  addSkyship,
  removeGoldAmount,
  removeOneCounsellor,
} from "../../helpers/stateUtils";

const purchaseSkyships: Move<MyGameState> = (
  { G, playerID }: { G: MyGameState; playerID: string },
  slotIndex: number,
  republic: "zeeland" | "venoa"
) => {
  if (checkCounsellorsNotZero(playerID, G)) {
    return INVALID_MOVE;
  }

  const boardSlots =
    republic === "venoa"
      ? G.boardState.purchaseSkyshipsVenoa
      : G.boardState.purchaseSkyshipsZeeland;

  const slot: keyof typeof boardSlots = (slotIndex + 1) as 1 | 2;

  if (boardSlots[slot] !== undefined) {
    console.log("Player has chosen an action which has already been taken");
    return INVALID_MOVE;
  }

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
};

export default purchaseSkyships;
