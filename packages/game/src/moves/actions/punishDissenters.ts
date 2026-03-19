import { MyGameState, MoveError, MoveDefinition } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";
import {
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  removeGoldAmount,
  removeOneCounsellor,
  removeVPAmount,
} from "../../helpers/stateUtils";
import { PUNISH_EXECUTE_VP_COST, BASE_PRISONERS, MORE_PRISONS_BONUS, PUNISH_GOLD_COST } from "../../codifiedGameInfo";

const validatePunishDissenters = (
  G: MyGameState,
  playerID: string,
  slotIndex: number,
  paymentType: "gold" | "counsellor" | "execute",
  numPlayers: number
): MoveError | null => {
  const value: keyof typeof G.boardState.punishDissenters = (slotIndex + 1) as
    | 1 | 2 | 3 | 4 | 5 | 6;

  const base = validateMove(playerID, G, {
    costsCounsellor: true,
    costsGold: paymentType === "gold",
  });
  if (base) return base;

  if (value > numPlayers) {
    return { code: "SLOT_OUT_OF_RANGE", message: "That Dissenters slot does not exist in this game" };
  }

  if (G.boardState.punishDissenters[value] !== undefined) {
    return { code: "SLOT_TAKEN", message: "That Dissenters slot is already taken" };
  }

  const alreadyPunishing = Object.values(G.boardState.punishDissenters).some(
    (id) => id === playerID
  );
  if (alreadyPunishing) {
    return { code: "ALREADY_PUNISHING", message: "Your Kingdom is already punishing Dissenters this round" };
  }

  const playerInfo = G.playerInfo[playerID];

  if (paymentType === "execute") {
    if (playerInfo.prisoners <= 0) {
      return { code: "NO_PRISONERS", message: "No prisoners to execute" };
    }
    return null;
  }

  const maxPrisoners =
    playerInfo.resources.advantageCard === "more_prisons"
      ? BASE_PRISONERS + MORE_PRISONS_BONUS
      : BASE_PRISONERS;

  if (playerInfo.prisoners >= maxPrisoners) {
    return { code: "PRISON_FULL", message: `Prison is full — cannot take more prisoners (max ${maxPrisoners})` };
  }

  if (paymentType === "gold") {
    if (playerInfo.resources.gold < PUNISH_GOLD_COST) {
      return {
        code: "INSUFFICIENT_GOLD",
        message: `Not enough Gold — need ${PUNISH_GOLD_COST}, have ${playerInfo.resources.gold}`,
      };
    }
  } else if (paymentType === "counsellor") {
    if (playerInfo.resources.counsellors < 2) {
      return { code: "INSUFFICIENT_COUNSELLORS", message: "Need 2 Counsellors to pay by Counsellor" };
    }
  } else {
    return { code: "INVALID_PAYMENT_TYPE", message: "Invalid payment type" };
  }

  return null;
};

const punishDissenters: MoveDefinition = {
  fn: ({ G, ctx, playerID }, ...args: any[]) => {
    const value: keyof typeof G.boardState.punishDissenters = args[0] + 1;
    const paymentType: "gold" | "counsellor" | "execute" = args[1];

    if (validatePunishDissenters(G, playerID, args[0], paymentType, ctx.numPlayers)) return INVALID_MOVE;

    const playerInfo = G.playerInfo[playerID];

    // GAP-11: execute an existing prisoner — returns cube to pool, shifts heresy, costs 1 VP
    if (paymentType === "execute") {
      playerInfo.prisoners -= 1;
      removeVPAmount(G, playerID, PUNISH_EXECUTE_VP_COST);
      if (playerInfo.hereticOrOrthodox === "orthodox") {
        increaseOrthodoxyWithinMove(G, playerID);
      } else {
        increaseHeresyWithinMove(G, playerID);
      }
      removeOneCounsellor(G, playerID); // counsellor placed on board
      G.boardState.punishDissenters[value] = playerID;
      G.playerInfo[playerID].turnComplete = true;
      return;
    }

    // GAP-6: more_prisons KA raises max prisoners from 3 to 4
    const maxPrisoners = playerInfo.resources.advantageCard === "more_prisons"
      ? BASE_PRISONERS + MORE_PRISONS_BONUS
      : BASE_PRISONERS;
    if (playerInfo.prisoners >= maxPrisoners) {
      return INVALID_MOVE;
    }

    // B6: cost = 2 Gold OR 1 extra counsellor (player's choice via paymentType arg)
    if (paymentType === "gold") {
      if (playerInfo.resources.gold < PUNISH_GOLD_COST) {
        return INVALID_MOVE;
      }
      removeGoldAmount(G, playerID, PUNISH_GOLD_COST);
    } else if (paymentType === "counsellor") {
      if (playerInfo.resources.counsellors < 2) {
        return INVALID_MOVE;
      }
      removeOneCounsellor(G, playerID); // extra counsellor payment
    } else {
      return INVALID_MOVE;
    }

    removeOneCounsellor(G, playerID); // counsellor placed on board
    playerInfo.prisoners += 1;

    if (playerInfo.hereticOrOrthodox === "orthodox") {
      increaseOrthodoxyWithinMove(G, playerID);
    } else {
      increaseHeresyWithinMove(G, playerID);
    }

    G.boardState.punishDissenters[value] = playerID;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot punish Dissenters right now",
  validate: (G, playerID, slotIndex, paymentType) => validatePunishDissenters(G, playerID, slotIndex, paymentType, Object.keys(G.playerInfo).length),
  successLog: (G, pid, _slot, paymentType) => {
    const k = G.playerInfo[pid].kingdomName;
    if (paymentType === "execute") return `${k} executes a prisoner`;
    return `${k} punishes Dissenters (pays ${paymentType})`;
  },
};

export default punishDissenters;
