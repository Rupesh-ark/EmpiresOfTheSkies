import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";
import { validateMove } from "../moveValidation";
import {
  increaseHeresyWithinMove,
  increaseOrthodoxyWithinMove,
  removeGoldAmount,
  removeOneCounsellor,
  removeVPAmount,
} from "../../helpers/stateUtils";
import { Ctx } from "boardgame.io/dist/types/src/types";
import {
  BASE_PRISONERS,
  MORE_PRISONS_BONUS,
  PUNISH_GOLD_COST,
  PUNISH_EXECUTE_VP_COST,
} from "../../codifiedGameInfo";

const punishDissenters: Move<MyGameState> = (
  { G, ctx, playerID }: { G: MyGameState; ctx: Ctx; playerID: string },
  ...args: any[]
) => {
  const value: keyof typeof G.boardState.punishDissenters = args[0] + 1;
  const paymentType: "gold" | "counsellor" | "execute" = args[1];

  if (validateMove(playerID, G, {
    costsCounsellor: true,
    costsGold: paymentType === "gold",
  })) return INVALID_MOVE;
  if (value > ctx.numPlayers) {
    console.log("Player has selected a slot only available in larger games");
    return INVALID_MOVE;
  }
  if (G.boardState.punishDissenters[value] !== undefined) {
    console.log("Player has selected a slot which is already taken");
    return INVALID_MOVE;
  }

  const alreadyPunishing = Object.values(G.boardState.punishDissenters).some(
    (id) => id === playerID
  );
  if (alreadyPunishing) {
    console.log("Player has already punished dissenters this round");
    return INVALID_MOVE;
  }

  const playerInfo = G.playerInfo[playerID];

  // GAP-11: execute an existing prisoner — returns cube to pool, shifts heresy, costs 1 VP
  if (paymentType === "execute") {
    if (playerInfo.prisoners <= 0) {
      return INVALID_MOVE;
    }
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
};

export default punishDissenters;
