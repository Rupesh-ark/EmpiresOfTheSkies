import { MyGameState, MoveError } from "../types";

export const validateMove = (
  playerID: string,
  G: MyGameState,
  opts: { costsCounsellor?: boolean; costsGold?: boolean } = {}
): MoveError | null => {
  // Main action already taken this turn
  if (opts.costsCounsellor && G.playerInfo[playerID].turnComplete) {
    return { code: "TURN_COMPLETE", message: "You have already taken your action this turn" };
  }

  // Action availability check: actionsTaken < counsellors
  if (opts.costsCounsellor && G.playerInfo[playerID].actionsTakenThisRound >= G.playerInfo[playerID].resources.counsellors) {
    return { code: "NO_COUNSELLORS", message: "No Counsellors available to place" };
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
