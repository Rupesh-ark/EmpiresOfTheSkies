/**
 * Central registry of action-phase MoveDefinitions.
 *
 * The frontend uses this to call validate() before invoking moves,
 * providing immediate error feedback via toasts. See docs/TOAST_SYSTEM.md.
 *
 * Any MoveDefinition with a `validate` property will automatically
 * get client-side validation — no separate registry needed.
 */
import { MoveDefinition } from "./types";

import alterPlayerOrder from "./moves/actions/alterPlayerOrder";
import recruitCounsellors from "./moves/actions/recruitCounsellors";
import recruitRegiments from "./moves/actions/recruitRegiments";
import purchaseSkyships from "./moves/actions/purchaseSkyships";
import foundBuildings from "./moves/actions/foundBuildings";
import foundFactory from "./moves/actions/foundFactory";
import { increaseHeresy, increaseOrthodoxy } from "./moves/actions/heresyMoves";
import checkAndPlaceFort from "./moves/actions/checkAndPlaceFort";
import punishDissenters from "./moves/actions/punishDissenters";
import convertMonarch from "./moves/actions/convertMonarch";
import influencePrelates from "./moves/actions/influencePrelates";
import trainTroops from "./moves/actions/trainTroops";
import discardFoWCard from "./moves/actions/discardFoWCard";
import flipCards from "./moves/actions/flipCards";
import buildSkyships from "./moves/actions/buildSkyships";
import conscriptLevies from "./moves/actions/conscriptLevies";
import passFleetInfoToPlayerInfo from "./moves/actions/passFleetInfoToPlayerInfo";
import deployFleet from "./moves/actions/deployFleet";
import transferBetweenFleets from "./moves/actions/transferBetweenFleets";
import sellSkyships from "./moves/actions/sellSkyships";
import sellBuilding from "./moves/actions/sellBuilding";
import transferOutpost from "./moves/actions/transferOutpost";
import proposeDeal from "./moves/actions/proposeDeal";
import acceptDeal from "./moves/actions/acceptDeal";
import rejectDeal from "./moves/actions/rejectDeal";
import enableDispatchButtons from "./moves/actions/enableDispatchButtons";
import issueHolyDecree from "./moves/actions/issueHolyDecree";
import declareSmugglerGood from "./moves/actions/declareSmugglerGood";
import pass from "./moves/pass";

export const MOVE_DEFINITIONS: Record<string, MoveDefinition> = {
  alterPlayerOrder,
  recruitCounsellors,
  recruitRegiments,
  purchaseSkyships,
  foundBuildings,
  foundFactory,
  increaseHeresy,
  increaseOrthodoxy,
  checkAndPlaceFort,
  punishDissenters,
  convertMonarch,
  influencePrelates,
  trainTroops,
  discardFoWCard,
  flipCards,
  buildSkyships,
  conscriptLevies,
  passFleetInfoToPlayerInfo,
  deployFleet,
  transferBetweenFleets,
  sellSkyships,
  sellBuilding,
  transferOutpost,
  proposeDeal,
  acceptDeal,
  rejectDeal,
  enableDispatchButtons,
  issueHolyDecree,
  declareSmugglerGood,
  pass,
};
