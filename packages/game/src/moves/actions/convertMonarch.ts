import { MyGameState, MoveError, MoveDefinition } from "../../types.js";
import {
  removeGoldAmount,
  incrementActionsTaken,
  spendCounsellor,
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
} from "../../helpers/stateUtils.js";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation.js";
import { CONVERT_MONARCH_GOLD_COST } from "../../helpers/actionCosts.js";

const validateConvertMonarch = (
  G: MyGameState,
  playerID: string
): MoveError | null => {
  const base = validateMove(playerID, G, { costsCounsellor: true, costsGold: true });
  if (base) return base;

  if (G.eventState.cannotConvertThisRound.includes(playerID)) {
    return { code: "CONVERSION_BLOCKED", message: "Your Monarch cannot convert again this round" };
  }

  const alreadyConverting = G.boardState.convertMonarch.includes(playerID);
  if (alreadyConverting) {
    return { code: "ALREADY_CONVERTING", message: "Your Monarch is already converting this round" };
  }

  return null;
};

const convertMonarch: MoveDefinition = {
  fn: ({ G, playerID }) => {
    const playerInfo = G.playerInfo[playerID];

    if (validateConvertMonarch(G, playerID)) return INVALID_MOVE;

    removeGoldAmount(G, playerID, CONVERT_MONARCH_GOLD_COST);
    spendCounsellor(G, playerID);
    incrementActionsTaken(G, playerID);

    if (playerInfo.hereticOrOrthodox === "heretic") {
      playerInfo.hereticOrOrthodox = "orthodox";
      for (let i = 0; i < playerInfo.prisoners; i++) {
        increaseOrthodoxyWithinMove(G, playerID);
      }
      playerInfo.prisoners = 0;
    } else {
      playerInfo.hereticOrOrthodox = "heretic";
      for (let i = 0; i < playerInfo.prisoners; i++) {
        increaseHeresyWithinMove(G, playerID);
      }
      playerInfo.prisoners = 0;
    }

    G.boardState.convertMonarch.push(playerID);
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot convert your Monarch right now",
  validate: (G, playerID, _slotIndex) => validateConvertMonarch(G, playerID),
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const alignment = G.playerInfo[pid].hereticOrOrthodox;
    return `${k} converts Monarch (now ${alignment})`;
  },
};

export default convertMonarch;
