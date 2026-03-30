import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";
import {
  addLevyAmount,
  removeOneCounsellor,
  removeVPAmount,
  sanitizeValue,
} from "../../helpers/stateUtils";
import { LEVY_GROUP_SIZE, MAX_LEVIES } from "../../data/gameData";

const validateConscriptLevies = (
  G: MyGameState,
  playerID: string,
  levyAmount: number
): MoveError | null => {
  if (G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies) {
    return { code: "ALREADY_CONSCRIPTED", message: "Levies have already been conscripted this round" };
  }

  const base = validateMove(playerID, G, { costsCounsellor: true });
  if (base) return base;

  const sanitizedLevyAmount = sanitizeValue(levyAmount, 0);
  if (sanitizedLevyAmount <= 0) {
    return { code: "INVALID_LEVY_AMOUNT", message: "Must conscript at least 1 Levy" };
  }

  const currentLevies = sanitizeValue(G.playerInfo[playerID].resources.levies);
  if (currentLevies + sanitizedLevyAmount > MAX_LEVIES) {
    return {
      code: "LEVY_CAP_EXCEEDED",
      message: `Cannot exceed ${MAX_LEVIES} Levies — you have ${currentLevies}`,
    };
  }

  return null;
};

const conscriptLevies: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const rawLevyAmount = args[0];
    const levyAmount = sanitizeValue(rawLevyAmount, 0);

    // B4: enforce MAX_LEVIES cap
    if (validateConscriptLevies(G, playerID, levyAmount)) return INVALID_MOVE;

    // B4: ceil so a partial final group still costs 1 VP
    const cost = Math.ceil(levyAmount / LEVY_GROUP_SIZE);
    removeOneCounsellor(G, playerID);
    removeVPAmount(G, playerID, cost);
    addLevyAmount(G, playerID, levyAmount);
    G.playerInfo[playerID].playerBoardCounsellorLocations.conscriptLevies = true;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot conscript Levies right now",
  validate: validateConscriptLevies,
  successLog: (G, pid, levyAmount) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} conscripts ${levyAmount} Levies`;
  },
};

export default conscriptLevies;
