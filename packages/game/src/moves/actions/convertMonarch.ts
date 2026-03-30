import { MyGameState, MoveError, MoveDefinition } from "../../types";
import {
  removeGoldAmount,
  removeOneCounsellor,
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
} from "../../helpers/stateUtils";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";

const validateConvertMonarch = (
  G: MyGameState,
  playerID: string,
  slotIndex: number,
  numPlayers: number
): MoveError | null => {
  const base = validateMove(playerID, G, { costsGold: true });
  if (base) return base;

  const value: keyof typeof G.boardState.convertMonarch = (slotIndex + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6;

  if (G.eventState.cannotConvertThisRound.includes(playerID)) {
    return { code: "CONVERSION_BLOCKED", message: "Your Monarch cannot convert again this round" };
  }

  if (G.boardState.convertMonarch[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That conversion slot is already taken" };
  }

  if (value > numPlayers) {
    return { code: "SLOT_OUT_OF_RANGE", message: "That conversion slot does not exist in this game" };
  }

  const alreadyConverting = Object.values(G.boardState.convertMonarch).some(
    (id) => id === playerID
  );
  if (alreadyConverting) {
    return { code: "ALREADY_CONVERTING", message: "Your Monarch is already converting this round" };
  }

  if (G.playerInfo[playerID].resources.counsellors < 2) {
    return { code: "INSUFFICIENT_COUNSELLORS", message: "Converting requires 2 Counsellors" };
  }

  return null;
};

const convertMonarch: MoveDefinition = {
  fn: ({ G, ctx, playerID }, ...args: any[]) => {
    const value: keyof typeof G.boardState.convertMonarch = args[0] + 1;
    const playerInfo = G.playerInfo[playerID];

    if (validateConvertMonarch(G, playerID, args[0], ctx.numPlayers)) return INVALID_MOVE;

    removeGoldAmount(G, playerID, 2);
    removeOneCounsellor(G, playerID); // extra counsellor payment
    removeOneCounsellor(G, playerID); // counsellor placed on board

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

    G.boardState.convertMonarch[value] = playerID;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot convert your Monarch right now",
  validate: (G, playerID, slotIndex) => validateConvertMonarch(G, playerID, slotIndex, Object.keys(G.playerInfo).length),
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    const alignment = G.playerInfo[pid].hereticOrOrthodox;
    return `${k} converts Monarch (now ${alignment})`;
  },
};

export default convertMonarch;
