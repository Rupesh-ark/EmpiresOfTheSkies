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
import { PUNISH_EXECUTE_VP_COST, BASE_PRISONERS, MORE_PRISONS_BONUS, PUNISH_GOLD_COST } from "../../data/gameData";

const validatePunishDissenters = (
  G: MyGameState,
  playerID: string,
  slotIndex: number,
  paymentType: "gold" | "counsellor" | "execute",
  numPlayers: number,
  count: number = 1
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

  if (count < 1) {
    return { code: "INVALID_COUNT", message: "Must punish at least 1 dissenter" };
  }

  const playerInfo = G.playerInfo[playerID];
  const maxPrisoners =
    playerInfo.resources.advantageCard === "more_prisons"
      ? BASE_PRISONERS + MORE_PRISONS_BONUS
      : BASE_PRISONERS;

  if (paymentType === "execute") {
    if (playerInfo.prisoners <= 0) {
      return { code: "NO_PRISONERS", message: "No prisoners to execute" };
    }
    if (count > playerInfo.prisoners) {
      return { code: "NOT_ENOUGH_PRISONERS", message: `Only ${playerInfo.prisoners} prisoner(s) to execute` };
    }
    return null;
  }

  if (playerInfo.prisoners >= maxPrisoners) {
    return { code: "PRISON_FULL", message: `Prison is full — cannot take more prisoners (max ${maxPrisoners})` };
  }

  const capacity = maxPrisoners - playerInfo.prisoners;
  if (count > capacity) {
    return { code: "PRISON_OVERFLOW", message: `Only room for ${capacity} more prisoner(s)` };
  }

  if (paymentType === "gold") {
    // Gold check removed — rules allow debt (VP penalty at end of round)
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
    const count: number = args[2] ?? 1;

    if (validatePunishDissenters(G, playerID, args[0], paymentType, ctx.numPlayers, count)) return INVALID_MOVE;

    const playerInfo = G.playerInfo[playerID];

    if (paymentType === "execute") {
      for (let i = 0; i < count; i++) {
        playerInfo.prisoners -= 1;
        removeVPAmount(G, playerID, PUNISH_EXECUTE_VP_COST);
        if (playerInfo.hereticOrOrthodox === "orthodox") {
          increaseOrthodoxyWithinMove(G, playerID);
        } else {
          increaseHeresyWithinMove(G, playerID);
        }
      }
      removeOneCounsellor(G, playerID);
      G.boardState.punishDissenters[value] = playerID;
      G.playerInfo[playerID].turnComplete = true;
      return;
    }

    if (paymentType === "gold") {
      removeGoldAmount(G, playerID, PUNISH_GOLD_COST);
    } else if (paymentType === "counsellor") {
      if (playerInfo.resources.counsellors < 2) {
        return INVALID_MOVE;
      }
      removeOneCounsellor(G, playerID);
    } else {
      return INVALID_MOVE;
    }

    removeOneCounsellor(G, playerID);

    for (let i = 0; i < count; i++) {
      playerInfo.prisoners += 1;
      if (playerInfo.freeDissenters > 0) {
        playerInfo.freeDissenters -= 1;
      }
      if (playerInfo.hereticOrOrthodox === "orthodox") {
        increaseOrthodoxyWithinMove(G, playerID);
      } else {
        increaseHeresyWithinMove(G, playerID);
      }
    }

    G.boardState.punishDissenters[value] = playerID;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot punish Dissenters right now",
  validate: (G, playerID, slotIndex, paymentType, count) => validatePunishDissenters(G, playerID, slotIndex, paymentType, Object.keys(G.playerInfo).length, count),
  successLog: (G, pid, _slot, paymentType, count) => {
    const k = G.playerInfo[pid].kingdomName;
    const n = count ?? 1;
    if (paymentType === "execute") return `${k} executes ${n} prisoner${n > 1 ? "s" : ""}`;
    return `${k} imprisons ${n} dissenter${n > 1 ? "s" : ""} (pays ${paymentType})`;
  },
};

export default punishDissenters;
