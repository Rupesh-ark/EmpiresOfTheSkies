import { MyGameState, MoveError } from "../types.js";

export const validateMove = (
  playerID: string,
  G: MyGameState,
  opts: {
    costsCounsellor?: boolean;
    costsGold?: boolean;
    spendsExtraCounsellor?: boolean;
  } = {}
): MoveError | null => {
  // Main action already taken this turn
  if (opts.costsCounsellor && G.playerInfo[playerID].turnComplete) {
    return { code: "TURN_COMPLETE", message: "You have already taken your action this turn" };
  }

  // Action availability check: actionsTaken < counsellors
  if (opts.costsCounsellor && G.playerInfo[playerID].actionsTakenThisRound >= G.playerInfo[playerID].resources.counsellors) {
    return { code: "NO_COUNSELLORS", message: "No Counsellors available to place" };
  }

  // Some Kingdom actions place one Counsellor and return a second to the pool.
  if (
    opts.spendsExtraCounsellor &&
    G.playerInfo[playerID].resources.counsellors -
      G.playerInfo[playerID].actionsTakenThisRound <
      2
  ) {
    return {
      code: "NO_EXTRA_COUNSELLOR",
      message: "A second unspent Counsellor is required as payment",
    };
  }

  // Lenders Refuse Credit: players with outstanding debt cannot spend gold
  if (
    opts.costsGold &&
    G.eventState.lendersRefuseCredit.includes(playerID) &&
    G.playerInfo[playerID].resources.gold < 0
  ) {
    return { code: "CREDIT_REFUSED", message: "Lenders have refused your Kingdom further credit" };
  }

  return null;
};
