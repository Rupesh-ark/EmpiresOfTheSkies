import { MyGameState } from "../types";
import { INVALID_MOVE } from "boardgame.io/core/";

/**
 * Centralized pre-move validation. Each move declares what resources it
 * requires via `opts`, and this function checks whether the move is
 * allowed given the current game state (counsellors, event restrictions, etc.).
 *
 * Returns INVALID_MOVE if blocked, undefined if allowed.
 *
 * To add a new restriction (e.g. from a new event card), add it here —
 * no need to touch individual move files.
 */
export const validateMove = (
  playerID: string,
  G: MyGameState,
  opts: { costsCounsellor?: boolean; costsGold?: boolean } = {}
) => {
  // Counsellor placement check
  if (opts.costsCounsellor && G.playerInfo[playerID].resources.counsellors === 0) {
    return INVALID_MOVE;
  }

  // Lenders Refuse Credit: players with outstanding debt cannot spend gold
  if (
    opts.costsGold &&
    G.eventState.lendersRefuseCredit.includes(playerID) &&
    G.playerInfo[playerID].resources.gold < 0
  ) {
    return INVALID_MOVE;
  }
};
