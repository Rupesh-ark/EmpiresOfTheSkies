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
import confirmAction from "./moves/actions/confirmAction";
import discardFoWCard from "./moves/actions/discardFoWCard";
import drawFoWCards from "./moves/actions/drawFoWCards";
import flipCards from "./moves/actions/flipCards";
import buildSkyships from "./moves/actions/buildSkyships";
import conscriptLevies from "./moves/actions/conscriptLevies";
import passFleetInfoToPlayerInfo from "./moves/actions/passFleetInfoToPlayerInfo";
import deployFleet from "./moves/actions/deployFleet";
import moveFleet from "./moves/actions/moveFleet";
import transferBetweenFleets from "./moves/actions/transferBetweenFleets";
import sellSkyships from "./moves/actions/sellSkyships";
import sellBuilding from "./moves/actions/sellBuilding";
import transferOutpost from "./moves/actions/transferOutpost";
import proposeDeal from "./moves/actions/proposeDeal";
import acceptDeal from "./moves/actions/acceptDeal";
import rejectDeal from "./moves/actions/rejectDeal";
import enableDispatchButtons from "./moves/actions/enableDispatchButtons";
import issueHolyDecree from "./moves/actions/issueHolyDecree";
import garrisonTransfer from "./moves/actions/garrisonTransfer";
import declareSmugglerGood from "./moves/actions/declareSmugglerGood";
import pass from "./moves/pass";

import discoverTile from "./moves/discovery/discoverTile";
import attackOtherPlayersFleet from "./moves/aerialBattle/attackOtherPlayersFleet";
import doNotAttack from "./moves/aerialBattle/doNotAttack";
import retaliate from "./moves/aerialBattle/retaliate";
import evadeAttackingFleet from "./moves/aerialBattle/evadeAttackingFleet";
import drawCard from "./moves/aerialBattle/drawCard";
import pickCard from "./moves/aerialBattle/pickCard";
import relocateDefeatedFleet from "./moves/aerialBattle/relocateDefeatedFleet";
import plunder from "./moves/plunderLegends/plunder";
import doNotPlunder from "./moves/plunderLegends/doNotPlunder";
import attackPlayersBuilding from "./moves/groundBattle/attackPlayersBuilding";
import doNotGroundAttack from "./moves/groundBattle/doNotGroundAttack";
import defendGroundAttack from "./moves/groundBattle/defendGroundAttack";
import garrisonTroops from "./moves/groundBattle/garrisonTroops";
import yieldToAttacker from "./moves/groundBattle/yieldToAttacker";
import coloniseLand from "./moves/conquests/coloniseLand";
import constructOutpost from "./moves/conquests/constructOutpost";
import doNothing from "./moves/conquests/doNothing";
import drawCardConquest from "./moves/conquests/drawCardConquest";
import pickCardConquest from "./moves/conquests/pickCardConquest";
import vote from "./moves/election/vote";
import retrieveFleets from "./moves/resolution/retrieveFleets";
import pickKingdomAdvantageCard from "./moves/kingdomAdvantage/pickKingdomAdvantageCard";
import pickLegacyCard from "./moves/pickLegacyCard";
import chooseEventCard from "./moves/events/chooseEventCard";
import resolveEventChoice from "./moves/events/resolveEventChoice";
import immediateElectionVote from "./moves/events/immediateElectionVote";
import commitRebellionTroops from "./moves/events/commitRebellionTroops";
import contributeToRebellion from "./moves/events/contributeToRebellion";
import nominateCaptainGeneral from "./moves/events/nominateCaptainGeneral";
import contributeToGrandArmy from "./moves/events/contributeToGrandArmy";
import offerBuyoffGold from "./moves/events/offerBuyoffGold";
import respondToInfidelFleet from "./moves/events/respondToInfidelFleet";
import commitDeferredBattleCard from "./moves/events/commitDeferredBattleCard";

const RESOLUTION_GUARD = (G: MyGameState) => {
  if (G.stage.phase !== "resolution") {
    return { code: "WRONG_PHASE", message: "Can only use this move during Resolution" };
  }
  return null;
};

import { MyGameState } from "./types";

const AERIAL_FOW_GUARD: MoveDefinition["validate"] = (G, playerID) => {
  if (!G.battleState) return { code: "NO_BATTLE", message: "No active battle" };
  const sub = G.stage.sub;
  if (sub !== "aerial_resolve") return { code: "WRONG_STAGE", message: "Cannot pick/draw FoW card in this stage" };
  const battler = Object.values(G.battleState).find((b) => b.id === playerID);
  if (!battler) return { code: "NOT_IN_BATTLE", message: "You are not in this battle" };
  return null;
};

const CONQUEST_FOW_GUARD: MoveDefinition["validate"] = (G, playerID) => {
  if (!G.conquestState) return { code: "NO_CONQUEST", message: "No active conquest" };
  const sub = G.stage.sub;
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
  pass,

  discoverTile,
  attackOtherPlayersFleet,
  doNotAttack: { ...doNotAttack, validate: RESOLUTION_GUARD },
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
  doNotGroundAttack: { ...doNotGroundAttack, validate: RESOLUTION_GUARD },
  defendGroundAttack,
  garrisonTroops,
  yieldToAttacker,
  coloniseLand,
  constructOutpost: {
    ...constructOutpost,
    validate: (G, playerID) => {
      const sub = G.stage.sub;
      if (sub !== "conquest") return { code: "WRONG_STAGE", message: "Can only construct an outpost during conquest" };
      const [x, y] = G.mapState.currentBattle;
      const building = G.mapState.buildings[y]?.[x];
      if (!building) return { code: "NO_TILE", message: "No tile at current battle location" };
      if (building.player?.id !== playerID) return { code: "NOT_OWNER", message: "You do not control this tile" };
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
};
