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

// ── Per-move validators (re-exported from their respective move files) ─────────
export { validateTrainTroops } from "./actions/trainTroops";
export { validateBuildSkyships } from "./actions/buildSkyships";
export { validateConscriptLevies } from "./actions/conscriptLevies";
export { validateDeployFleet } from "./actions/deployFleet";
export { validatePassFleetInfo } from "./actions/passFleetInfoToPlayerInfo";
export { validatePurchaseSkyships } from "./actions/purchaseSkyships";
export { validateRecruitCounsellors } from "./actions/recruitCounsellors";
export { validateRecruitRegiments } from "./actions/recruitRegiments";
export { validateFoundBuildings } from "./actions/foundBuildings";
export { validateFoundFactory } from "./actions/foundFactory";
export { validateInfluencePrelates } from "./actions/influencePrelates";
export { validatePunishDissenters } from "./actions/punishDissenters";
export { validateAlterPlayerOrder } from "./actions/alterPlayerOrder";
export { validateConvertMonarch } from "./actions/convertMonarch";
