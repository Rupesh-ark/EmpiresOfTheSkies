import { MyGameState, MoveError } from "../types";

/**
 * Centralized pre-move validation. Each move declares what resources it
 * requires via `opts`, and this function checks whether the move is
 * allowed given the current game state (counsellors, event restrictions, etc.).
 *
 * Returns MoveError if blocked, null if allowed.
 *
 * To add a new restriction (e.g. from a new event card), add it here —
 * no need to touch individual move files.
 */
export const validateMove = (
  playerID: string,
  G: MyGameState,
  opts: { costsCounsellor?: boolean; costsGold?: boolean } = {}
): MoveError | null => {
  // Main action already taken this turn
  if (opts.costsCounsellor && G.playerInfo[playerID].turnComplete) {
    return { code: "TURN_COMPLETE", message: "You have already taken your action this turn" };
  }

  // Counsellor placement check
  if (opts.costsCounsellor && G.playerInfo[playerID].resources.counsellors === 0) {
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
