/**
 * Client-side move validators — keyed by move name.
 *
 * The frontend calls these BEFORE invoking moves to provide
 * immediate error feedback via toasts. See docs/TOAST_SYSTEM.md.
 *
 * Each validator returns MoveError | null. Only moves with a
 * validate function on their MoveDefinition are listed here.
 */
import { MyGameState, MoveError } from "./types";

import { validateRecruitCounsellors } from "./moves/actions/recruitCounsellors";
import { validateRecruitRegiments } from "./moves/actions/recruitRegiments";
import { validatePurchaseSkyships } from "./moves/actions/purchaseSkyships";
import { validateFoundBuildings } from "./moves/actions/foundBuildings";
import { validateFoundFactory } from "./moves/actions/foundFactory";
import { validateInfluencePrelates } from "./moves/actions/influencePrelates";
import { validatePunishDissenters } from "./moves/actions/punishDissenters";
import { validateConvertMonarch } from "./moves/actions/convertMonarch";
import { validateBuildSkyships } from "./moves/actions/buildSkyships";
import { validateConscriptLevies } from "./moves/actions/conscriptLevies";
import { validateTrainTroops } from "./moves/actions/trainTroops";
import { validateAlterPlayerOrder } from "./moves/actions/alterPlayerOrder";
import { validateDeployFleet } from "./moves/actions/deployFleet";
import { validatePassFleetInfo } from "./moves/actions/passFleetInfoToPlayerInfo";

// Re-export individual validators for direct use
export {
  validateRecruitCounsellors,
  validateRecruitRegiments,
  validatePurchaseSkyships,
  validateFoundBuildings,
  validateFoundFactory,
  validateInfluencePrelates,
  validatePunishDissenters,
  validateConvertMonarch,
  validateBuildSkyships,
  validateConscriptLevies,
  validateTrainTroops,
  validateAlterPlayerOrder,
  validateDeployFleet,
  validatePassFleetInfo,
};

/**
 * Map of move name → validate function.
 * Used by useValidatedMoves hook to intercept moves client-side.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MOVE_VALIDATORS: Record<string, (G: MyGameState, playerID: string, ...args: any[]) => MoveError | null> = {
  recruitCounsellors: (G, pid, ...args) => validateRecruitCounsellors(G, pid, args[0]),
  recruitRegiments: (G, pid, ...args) => validateRecruitRegiments(G, pid, args[0]),
  purchaseSkyships: (G, pid, ...args) => validatePurchaseSkyships(G, pid, args[0], args[1]),
  foundBuildings: (G, pid, ...args) => validateFoundBuildings(G, pid, args[0], args[1]),
  foundFactory: (G, pid, ...args) => validateFoundFactory(G, pid, args[0]),
  influencePrelates: (G, pid, ...args) => validateInfluencePrelates(G, pid, args[0]),
  punishDissenters: (G, pid, ...args) => validatePunishDissenters(G, pid, args[0], args[1], Object.keys(G.playerInfo).length),
  convertMonarch: (G, pid, ...args) => validateConvertMonarch(G, pid, args[0], Object.keys(G.playerInfo).length),
  buildSkyships: (G, pid, ...args) => validateBuildSkyships(G, pid, args[0]),
  conscriptLevies: (G, pid, ...args) => validateConscriptLevies(G, pid, args[0]),
  trainTroops: (G, pid) => validateTrainTroops(G, pid),
  alterPlayerOrder: (G, pid, ...args) => validateAlterPlayerOrder(G, pid, args[0], Object.keys(G.playerInfo).length),
  deployFleet: (G, pid, ...args) => validateDeployFleet(G, pid, args[0], args[1], args[2], args[3], args[4]),
  passFleetInfoToPlayerInfo: (G, pid, ...args) => validatePassFleetInfo(G, pid, args[0], args[1], args[2], args[3], args[4] ?? 0),
};
