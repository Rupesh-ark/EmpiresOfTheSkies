import { MoveDefinition } from "./types.js";

import alterPlayerOrder from "./moves/actions/alterPlayerOrder.js";
import recruitCounsellors from "./moves/actions/recruitCounsellors.js";
import recruitRegiments from "./moves/actions/recruitRegiments.js";
import purchaseSkyships from "./moves/actions/purchaseSkyships.js";
import foundBuildings from "./moves/actions/foundBuildings.js";
import foundFactory from "./moves/actions/foundFactory.js";
import { increaseHeresy, increaseOrthodoxy } from "./moves/actions/heresyMoves.js";
import checkAndPlaceFort from "./moves/actions/checkAndPlaceFort.js";
import punishDissenters from "./moves/actions/punishDissenters.js";
import convertMonarch from "./moves/actions/convertMonarch.js";
import influencePrelates from "./moves/actions/influencePrelates.js";
import trainTroops from "./moves/actions/trainTroops.js";
import confirmAction from "./moves/actions/confirmAction.js";
import discardFoWCard from "./moves/actions/discardFoWCard.js";
import drawFoWCards from "./moves/actions/drawFoWCards.js";
import flipCards from "./moves/actions/flipCards.js";
import buildSkyships from "./moves/actions/buildSkyships.js";
import conscriptLevies from "./moves/actions/conscriptLevies.js";
import passFleetInfoToPlayerInfo from "./moves/actions/passFleetInfoToPlayerInfo.js";
import deployFleet from "./moves/actions/deployFleet.js";
import moveFleet from "./moves/actions/moveFleet.js";
import transferBetweenFleets from "./moves/actions/transferBetweenFleets.js";
import sellSkyships from "./moves/actions/sellSkyships.js";
import sellBuilding from "./moves/actions/sellBuilding.js";
import transferOutpost from "./moves/actions/transferOutpost.js";
import proposeDeal from "./moves/actions/proposeDeal.js";
import acceptDeal from "./moves/actions/acceptDeal.js";
import rejectDeal from "./moves/actions/rejectDeal.js";
import enableDispatchButtons from "./moves/actions/enableDispatchButtons.js";
import issueHolyDecree from "./moves/actions/issueHolyDecree.js";
import garrisonTransfer from "./moves/actions/garrisonTransfer.js";
import declareSmugglerGood from "./moves/actions/declareSmugglerGood.js";
import sendAgitators from "./moves/actions/sendAgitators.js";
import pass from "./moves/pass.js";

import discoverTile from "./moves/discovery/discoverTile.js";
import attackOtherPlayersFleet from "./moves/aerialBattle/attackOtherPlayersFleet.js";
import doNotAttack from "./moves/aerialBattle/doNotAttack.js";
import retaliate from "./moves/aerialBattle/retaliate.js";
import evadeAttackingFleet from "./moves/aerialBattle/evadeAttackingFleet.js";
import drawCard from "./moves/aerialBattle/drawCard.js";
import pickCard from "./moves/aerialBattle/pickCard.js";
import relocateDefeatedFleet from "./moves/aerialBattle/relocateDefeatedFleet.js";
import plunder from "./moves/plunderLegends/plunder.js";
import doNotPlunder from "./moves/plunderLegends/doNotPlunder.js";
import attackPlayersBuilding from "./moves/groundBattle/attackPlayersBuilding.js";
import doNotGroundAttack from "./moves/groundBattle/doNotGroundAttack.js";
import defendGroundAttack from "./moves/groundBattle/defendGroundAttack.js";
import garrisonTroops from "./moves/groundBattle/garrisonTroops.js";
import yieldToAttacker from "./moves/groundBattle/yieldToAttacker.js";
import coloniseLand from "./moves/conquests/coloniseLand.js";
import constructOutpost from "./moves/conquests/constructOutpost.js";
import doNothing from "./moves/conquests/doNothing.js";
import drawCardConquest from "./moves/conquests/drawCardConquest.js";
import pickCardConquest from "./moves/conquests/pickCardConquest.js";
import vote from "./moves/election/vote.js";
import retrieveFleets from "./moves/resolution/retrieveFleets.js";
import pickKingdomAdvantageCard from "./moves/kingdomAdvantage/pickKingdomAdvantageCard.js";
import pickLegacyCard from "./moves/pickLegacyCard.js";
import chooseEventCard from "./moves/events/chooseEventCard.js";
import resolveEventChoice from "./moves/events/resolveEventChoice.js";
import immediateElectionVote from "./moves/events/immediateElectionVote.js";
import commitRebellionTroops from "./moves/events/commitRebellionTroops.js";
import contributeToRebellion from "./moves/events/contributeToRebellion.js";
import nominateCaptainGeneral from "./moves/events/nominateCaptainGeneral.js";
import contributeToGrandArmy from "./moves/events/contributeToGrandArmy.js";
import offerBuyoffGold from "./moves/events/offerBuyoffGold.js";
import respondToInfidelFleet from "./moves/events/respondToInfidelFleet.js";
import commitDeferredBattleCard from "./moves/events/commitDeferredBattleCard.js";
import acknowledgeRoundSummary from "./moves/reset/acknowledgeRoundSummary.js";

const AERIAL_FOW_GUARD: MoveDefinition["validate"] = (G, playerID) => {
  if (!G.battleState) return { code: "NO_BATTLE", message: "No active battle" };
  const sub = G.step;
  if (sub !== "aerial_resolve") return { code: "WRONG_STAGE", message: "Cannot pick/draw FoW card in this stage" };
  const battler = Object.values(G.battleState).find((b) => b.id === playerID);
  if (!battler) return { code: "NOT_IN_BATTLE", message: "You are not in this battle" };
  return null;
};

const CONQUEST_FOW_GUARD: MoveDefinition["validate"] = (G, playerID) => {
  if (!G.conquestState) return { code: "NO_CONQUEST", message: "No active conquest" };
  const sub = G.step;
  if (sub !== "conquest_draw_or_pick") return { code: "WRONG_STAGE", message: "Cannot pick/draw conquest FoW card in this stage" };
  if (G.conquestState.id !== playerID) return { code: "NOT_CONQUEROR", message: "You are not the conquering player" };
  return null;
};

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
  confirmAction,
  discardFoWCard,
  drawFoWCards,
  flipCards,
  buildSkyships,
  conscriptLevies,
  passFleetInfoToPlayerInfo,
  deployFleet,
  moveFleet,
  transferBetweenFleets,
  sellSkyships,
  sellBuilding,
  transferOutpost,
  proposeDeal,
  acceptDeal,
  rejectDeal,
  enableDispatchButtons,
  issueHolyDecree,
  garrisonTransfer,
  declareSmugglerGood,
  sendAgitators,
  pass,

  discoverTile,
  attackOtherPlayersFleet,
  doNotAttack,
  retaliate,
  evadeAttackingFleet,
  drawCard: { ...drawCard, validate: AERIAL_FOW_GUARD },
  pickCard: {
    ...pickCard,
    validate: (G, playerID, ...args) => {
      const baseErr = AERIAL_FOW_GUARD(G, playerID);
      if (baseErr) return baseErr;
      const value = args[0];
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return { code: "INVALID_INDEX", message: "Invalid card index" };
      }
      const cards = G.playerInfo[playerID]?.resources?.fortuneCards;
      if (!cards || value >= cards.length) {
        return { code: "OUT_OF_BOUNDS", message: "Card index out of bounds" };
      }
      return null;
    },
  },
  relocateDefeatedFleet,
  plunder,
  doNotPlunder,
  attackPlayersBuilding,
  doNotGroundAttack,
  defendGroundAttack,
  garrisonTroops,
  yieldToAttacker,
  coloniseLand,
  constructOutpost: {
    ...constructOutpost,
    validate: (G, playerID) => {
      const sub = G.step;
      if (sub !== "conquest") return { code: "WRONG_STAGE", message: "Can only construct an outpost during conquest" };
      const [x, y] = G.mapState.currentBattle;
      const building = G.mapState.buildings[y]?.[x];
      if (!building) return { code: "NO_TILE", message: "No tile at current battle location" };
      // Unclaimed (or yielded) lands are valid; only reject if another player owns it.
      if (building.player && building.player.id !== playerID) return { code: "NOT_OWNER", message: "You do not control this tile" };
      return null;
    },
  },
  doNothing,
  drawCardConquest: { ...drawCardConquest, validate: CONQUEST_FOW_GUARD },
  pickCardConquest: {
    ...pickCardConquest,
    validate: (G, playerID, ...args) => {
      const baseErr = CONQUEST_FOW_GUARD(G, playerID);
      if (baseErr) return baseErr;
      const value = args[0];
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return { code: "INVALID_INDEX", message: "Invalid card index" };
      }
      const cards = G.playerInfo[playerID]?.resources?.fortuneCards;
      if (!cards || value >= cards.length) {
        return { code: "OUT_OF_BOUNDS", message: "Card index out of bounds" };
      }
      return null;
    },
  },
  vote,
  retrieveFleets,
  pickKingdomAdvantageCard,
  pickLegacyCard,
  chooseEventCard,
  resolveEventChoice,
  immediateElectionVote,
  commitRebellionTroops,
  contributeToRebellion,
  nominateCaptainGeneral,
  contributeToGrandArmy,
  offerBuyoffGold,
  respondToInfidelFleet,
  commitDeferredBattleCard,
  acknowledgeRoundSummary,
};
