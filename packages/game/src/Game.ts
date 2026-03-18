import type { Game, Ctx } from "boardgame.io";

import { LegacyCardInfo, MyGameState, MapState } from "./types";

import { ALL_KA_CARDS, CONTINGENT_COUNTERS, EVENT_HAND_SIZE, FINAL_ROUND, INFIDEL_HOST_COUNTERS, LEGACY_CARDS } from "./codifiedGameInfo";
import { initialBoardState, initialBattleMapState } from "./setup/boardSetup";
import {
  getRandomisedMapTileArray,
  getInitialDiscoveredTiles,
  getInitialOutpostsAndColoniesInfo,
} from "./setup/mapSetup";
import { buildPlayerInfoMap, getGoldIncomeForPlayer } from "./setup/playerSetup";
import discoverTile from "./moves/discovery/discoverTile";
import alterPlayerOrder from "./moves/actions/alterPlayerOrder";
import recruitCounsellors from "./moves/actions/recruitCounsellors";
import recruitRegiments from "./moves/actions/recruitRegiments";
import purchaseSkyships from "./moves/actions/purchaseSkyships";
import foundBuildings from "./moves/actions/foundBuildings";
import foundFactory from "./moves/actions/foundFactory";
import checkAndPlaceFort from "./moves/actions/checkAndPlaceFort";
import flipCards from "./moves/actions/flipCards";
import { increaseHeresy, increaseOrthodoxy } from "./moves/actions/heresyMoves";
import punishDissenters from "./moves/actions/punishDissenters";
import convertMonarch from "./moves/actions/convertMonarch";
import influencePrelates from "./moves/actions/influencePrelates";
import {
  checkIfCurrentPlayerIsInCurrentBattle,
  fullResetFortuneOfWarCardDeck,
} from "./helpers/helpers";
import trainTroops from "./moves/actions/trainTroops";
import discardFoWCard from "./moves/actions/discardFoWCard";
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
import attackOtherPlayersFleet from "./moves/aerialBattle/attackOtherPlayersFleet";
import evadeAttackingFleet from "./moves/aerialBattle/evadeAttackingFleet";
import doNotAttack from "./moves/aerialBattle/doNotAttack";
import retaliate from "./moves/aerialBattle/retaliate";
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


import { findNextBattle, findNextGroundBattle, findNextPlunder } from "./helpers/findNext";
import { TurnOrder } from "boardgame.io/core";
import resolveRound from "./helpers/resolveRound";
import pickLegacyCard from "./moves/pickLegacyCard";
import pickKingdomAdvantageCard from "./moves/kingdomAdvantage/pickKingdomAdvantageCard";
import chooseEventCard from "./moves/events/chooseEventCard";
import resolveEventChoice from "./moves/events/resolveEventChoice";
import { ALL_EVENT_CARD_NAMES } from "./helpers/eventCardDefinitions";
import { prepareInfidelFleetCombat } from "./helpers/resolveInfidelFleet";
import { continueResolution } from "./helpers/resolutionFlow";
import respondToInfidelFleet from "./moves/events/respondToInfidelFleet";
import commitRebellionTroops from "./moves/events/commitRebellionTroops";
import contributeToRebellion from "./moves/events/contributeToRebellion";
import offerBuyoffGold from "./moves/events/offerBuyoffGold";
import nominateCaptainGeneral from "./moves/events/nominateCaptainGeneral";
import commitDeferredBattleCard from "./moves/events/commitDeferredBattleCard";
import contributeToGrandArmy from "./moves/events/contributeToGrandArmy";
import { logEvent, allPlayersPassed } from "./helpers/stateUtils";
import { withLogging, withPhaseGuard, withPhaseReset, checkLoopGuard } from "./helpers/moveWrapper";
import { createLogger } from "./helpers/logger";

const phaseLog = createLogger("phase");

const MyGame: Game<MyGameState> = {
  turn: { minMoves: 1 },
  name: "empires-of-the-skies",
  setup: ({ ctx, random }: { ctx: Ctx; random: { Shuffle: <T>(arr: T[]) => T[] } }): MyGameState => {
    const mapState: MapState = {
      currentTileArray: getRandomisedMapTileArray(random.Shuffle),
      discoveredTiles: getInitialDiscoveredTiles(),
      buildings: getInitialOutpostsAndColoniesInfo(),
      mostRecentlyDiscoveredTile: [4, 0],
      discoveredRaces: [],
      battleMap: initialBattleMapState(),
      currentBattle: [0, 0],
      goodsPriceMarkers: {
        mithril: 4,
        dragonScales: 3,
        krakenSkin: 3,
        magicDust: 4,
        stickyIchor: 3,
        pipeweed: 3,
      },
    };

    const playerInfoMap = buildPlayerInfoMap(ctx);

    // GAP-18: compute which player-type kingdoms are NPRs this session (1 cathedral each to start)
    const assignedKingdoms = new Set(
      Object.values(playerInfoMap).map((p) => p.kingdomName)
    );
    const ALL_PLAYER_KINGDOMS = [
      "Angland", "Gallois", "Castillia", "Nordmark", "Ostreich", "Constantium",
    ];
    const nprCathedrals: Record<string, number> = {};
    ALL_PLAYER_KINGDOMS.forEach((k) => {
      if (!assignedKingdoms.has(k as any)) {
        nprCathedrals[k] = 1;
      }
    });

    // Shuffle contingent counter pool (used for rebellions and Grand Army)
    const contingentPool = random.Shuffle([...CONTINGENT_COUNTERS]);

    // Shuffle Infidel Host counter pool
    const infidelHostPool = random.Shuffle(INFIDEL_HOST_COUNTERS.map((c) => ({ ...c })));

    // Shuffle event deck and deal EVENT_HAND_SIZE cards to each player
    const eventDeck = random.Shuffle([...ALL_EVENT_CARD_NAMES]);
    for (const id of ctx.playOrder) {
      playerInfoMap[id].resources.eventCards = eventDeck.splice(
        0,
        EVENT_HAND_SIZE
      );
    }

    return {
      playerInfo: playerInfoMap,
      mapState: mapState,
      boardState: { ...initialBoardState },
      cardDecks: {
        fortuneOfWarCards: random.Shuffle(fullResetFortuneOfWarCardDeck()),
        discardedFortuneOfWarCards: [],
        kingdomAdvantagePool: [...ALL_KA_CARDS],
        legacyDeck: [],
      },
      stage: "discovery",
      electionResults: {},
      hasVoted: [],
      voteSubmitted: {},
      round: 0,
      finalRound: FINAL_ROUND,
      firstTurnOfRound: true,
      mustContinueDiscovery: false,
      nprCathedrals,
      turnOrder: ctx.playOrder,
      failedConquests: [],
      contingentPool,
      infidelHostPool,
      accumulatedHosts: [],
      infidelFleet: null,
      gameLog: [],
      currentRebellion: null,
      currentInvasion: null,
      infidelFleetCombat: null,
      currentDeferredBattle: null,
      pendingDeal: undefined,
      _loopGuard: 0,
      _halted: false,
      eventState: {
        deck: eventDeck,
        chosenCards: [],
        resolvedEvent: null,
        deferredEvents: [],
        pendingChoice: null,
        taxModifier: 0,
        peaceAccordActive: false,
        schismAffected: [],
        colonialPrelatesActive: false,
        dynasticMarriage: null,
        lendersRefuseCredit: [],
        nprHeretic: [],
        skipTaxesNextRound: false,
        cannotConvertThisRound: [],
        grandInfidelDies: false,
      },
    };
  },
  moves: {
    discoverTile: withLogging("discoverTile", discoverTile),
    alterPlayerOrder: withLogging("alterPlayerOrder", alterPlayerOrder),
    recruitCounsellors: withLogging("recruitCounsellors", recruitCounsellors),
    recruitRegiments: withLogging("recruitRegiments", recruitRegiments),
    purchaseSkyships: withLogging("purchaseSkyships", purchaseSkyships),
    foundBuildings: withLogging("foundBuildings", foundBuildings),
    increaseHeresy: withLogging("increaseHeresy", increaseHeresy),
    increaseOrthodoxy: withLogging("increaseOrthodoxy", increaseOrthodoxy),
    checkAndPlaceFort: withLogging("checkAndPlaceFort", checkAndPlaceFort),
    punishDissenters: withLogging("punishDissenters", punishDissenters),
    convertMonarch: withLogging("convertMonarch", convertMonarch),
    influencePrelates: withLogging("influencePrelates", influencePrelates),
    trainTroops: withLogging("trainTroops", trainTroops),
    flipCards: withLogging("flipCards", flipCards),
    buildSkyships: withLogging("buildSkyships", buildSkyships),
    conscriptLevies: withLogging("conscriptLevies", conscriptLevies),
    passFleetInfoToPlayerInfo: withLogging("passFleetInfoToPlayerInfo", passFleetInfoToPlayerInfo),
    deployFleet: withLogging("deployFleet", deployFleet),
    enableDispatchButtons: withLogging("enableDispatchButtons", enableDispatchButtons),
    issueHolyDecree: withLogging("issueHolyDecree", issueHolyDecree),
    pass: withLogging("pass", pass),
    attackOtherPlayersFleet: withLogging("attackOtherPlayersFleet", attackOtherPlayersFleet),
    evadeAttackingFleet: withLogging("evadeAttackingFleet", evadeAttackingFleet),
    doNotAttack: withLogging("doNotAttack", doNotAttack),
    retaliate: withLogging("retaliate", retaliate),
    drawCard: withLogging("drawCard", drawCard),
    pickCard: withLogging("pickCard", pickCard),
    relocateDefeatedFleet: withLogging("relocateDefeatedFleet", relocateDefeatedFleet),
    plunder: withLogging("plunder", plunder),
    doNotPlunder: withLogging("doNotPlunder", doNotPlunder),
    attackPlayersBuilding: withLogging("attackPlayersBuilding", attackPlayersBuilding),
    doNotGroundAttack: withLogging("doNotGroundAttack", doNotGroundAttack),
    defendGroundAttack: withLogging("defendGroundAttack", defendGroundAttack),
    garrisonTroops: withLogging("garrisonTroops", garrisonTroops),
    yieldToAttacker: withLogging("yieldToAttacker", yieldToAttacker),
    chooseEventCard: withLogging("chooseEventCard", chooseEventCard),
    resolveEventChoice: withLogging("resolveEventChoice", resolveEventChoice),
    commitRebellionTroops: withLogging("commitRebellionTroops", commitRebellionTroops),
    nominateCaptainGeneral: withLogging("nominateCaptainGeneral", nominateCaptainGeneral),
    contributeToGrandArmy: withLogging("contributeToGrandArmy", contributeToGrandArmy),
    respondToInfidelFleet: withLogging("respondToInfidelFleet", respondToInfidelFleet),
    contributeToRebellion: withLogging("contributeToRebellion", contributeToRebellion),
    offerBuyoffGold: withLogging("offerBuyoffGold", offerBuyoffGold),
  },
  phases: {
    kingdom_advantage: {
      start: true,
      moves: { pickKingdomAdvantageCard: withLogging("pickKingdomAdvantageCard", pickKingdomAdvantageCard) },
      next: "legacy_card",
      onBegin: withPhaseGuard("kingdom_advantage", (context) => {
        phaseLog.info("kingdom_advantage", { round: context.G.round });
        context.G.cardDecks.kingdomAdvantagePool = context.random.Shuffle(
          context.G.cardDecks.kingdomAdvantagePool
        );
      }),
      turn: {
        order: {
          first: () => 0,
          next: (context) =>
            context.ctx.playOrderPos + 1 < context.ctx.playOrder.length
              ? context.ctx.playOrderPos + 1
              : undefined,
          playOrder: (context) => [...context.ctx.playOrder].reverse(),
        },
      },
    },
    legacy_card: {
      moves: { pickLegacyCard: withLogging("pickLegacyCard", pickLegacyCard) },
      next: "events",
      onBegin: withPhaseGuard("legacy_card", (context) => {
        phaseLog.info("legacy_card", { round: context.G.round });
        context.G.stage = "pick legacy card";
        const cards: LegacyCardInfo[] = context.random.Shuffle([...LEGACY_CARDS]);
        let cardIndex = 0;
        Object.values(context.G.playerInfo).forEach((player) => {
          player.legacyCardOptions = cards.slice(cardIndex, cardIndex + 3);
          cardIndex += 3;
        });
        // Store remaining cards for Royal Succession event
        context.G.cardDecks.legacyDeck = cards.slice(cardIndex);
      }),
    },
    events: {
      turn: {
        order: TurnOrder.CUSTOM_FROM("turnOrder"),
      },
      onBegin: withPhaseGuard("events", (context) => {
        phaseLog.info("events", { round: context.G.round });
        context.G.stage = "events";
        context.G.eventState.taxModifier = 0;
        context.G.eventState.chosenCards = [];
        context.G.eventState.resolvedEvent = null;
        context.G.eventState.cannotConvertThisRound = [];
      }),
      moves: {
        chooseEventCard: withLogging("chooseEventCard", chooseEventCard),
        resolveEventChoice: withLogging("resolveEventChoice", resolveEventChoice),
      },
      next: "discovery",
    },
    discovery: {
      onBegin: (context) => {
        // Reset the loop guard at the start of each new round, then check.
        context.G._loopGuard = 0;
        context.G._halted = false;
        if (checkLoopGuard(context, "discovery")) return;
        phaseLog.info("discovery", { round: context.G.round + 1 });
        context.G.round += 1;
        context.ctx.playOrderPos = 0;
        context.G.stage = "discovery";

        context.G.firstTurnOfRound = true;

        Object.values(context.G.playerInfo).forEach((playerInfo: any) => {
          playerInfo.passed = false;
        });
        context.events.endTurn({ next: context.ctx.playOrder[0] });
        context.events.pass();
      },
      turn: {
        onBegin: (context) => {
          if (context.G.firstTurnOfRound && context.ctx.playOrderPos !== 0) {
            context.events.endTurn({ next: context.ctx.playOrder[0] });
          }
        },
        order: TurnOrder.CUSTOM_FROM("turnOrder"),
      },
      moves: {
        discoverTile: withLogging("discoverTile", discoverTile),
        pass: withLogging("pass", pass),
      },
      next: "taxes",
      onEnd: (context) => {
        Object.values(context.G.playerInfo).forEach((playerInfo: any) => {
          playerInfo.passed = false;
        });
      },
    },
    taxes: {
      turn: { order: TurnOrder.ONCE },
      onBegin: (context) => {
        if (context.G._halted) return;
        if (checkLoopGuard(context, "taxes")) return;
        phaseLog.info("taxes", { round: context.G.round });
        context.G.stage = "taxes";

        // Peasant REBELLION loss: skip taxes this round
        if (context.G.eventState.skipTaxesNextRound) {
          logEvent(context.G, "Taxes skipped due to Peasant Rebellion");
          context.G.eventState.skipTaxesNextRound = false;
          context.events.endPhase();
          return;
        }

        const taxMod = context.G.eventState.taxModifier;
        context.ctx.playOrder.forEach((id, index) => {
          let income = getGoldIncomeForPlayer(index) + taxMod;
          if (context.G.playerInfo[id].resources.advantageCard === "more_efficient_taxation") {
            income += 2;
          }
          context.G.playerInfo[id].resources.gold += Math.max(0, income);
        });
        logEvent(context.G, `Taxes collected${taxMod !== 0 ? ` (modifier: ${taxMod > 0 ? "+" : ""}${taxMod})` : ""}`);
        context.events.endPhase();
      },
      moves: {},
      next: "actions",
    },
    actions: {
      onBegin: (context) => {
        if (context.G._halted) return;
        if (checkLoopGuard(context, "actions")) return;
        phaseLog.info("actions", { round: context.G.round });
        context.G.firstTurnOfRound = true;
        context.G.stage = "actions";
      },
      turn: {
        onBegin: (context) => {
          if (context.G._halted) return;
          if (checkLoopGuard(context, "actions:turn")) return;
          if (context.G.firstTurnOfRound && context.ctx.playOrderPos !== 0) {
            context.events.endTurn({ next: context.ctx.playOrder[0] });
          }

          context.G.firstTurnOfRound = false;
          const currentPlayer = context.G.playerInfo[context.ctx.currentPlayer];

          if (currentPlayer.resources.counsellors === 0 && !currentPlayer.passed) {
            currentPlayer.passed = true;
            logEvent(context.G, `${currentPlayer.kingdomName} has no counsellors remaining — auto-passed`);
          }

          if (currentPlayer.passed) {
            if (allPlayersPassed(context.G)) {
              context.G.stage = "attack or pass";
              context.events.endPhase();
            } else {
              context.events.endTurn();
            }
          }
        },
        order: TurnOrder.CUSTOM_FROM("turnOrder"),
      },
      moves: {
        alterPlayerOrder: withLogging("alterPlayerOrder", alterPlayerOrder),
        recruitCounsellors: withLogging("recruitCounsellors", recruitCounsellors),
        recruitRegiments: withLogging("recruitRegiments", recruitRegiments),
        purchaseSkyships: withLogging("purchaseSkyships", purchaseSkyships),
        foundBuildings: withLogging("foundBuildings", foundBuildings),
        foundFactory: withLogging("foundFactory", foundFactory),
        increaseHeresy: withLogging("increaseHeresy", increaseHeresy),
        increaseOrthodoxy: withLogging("increaseOrthodoxy", increaseOrthodoxy),
        checkAndPlaceFort: withLogging("checkAndPlaceFort", checkAndPlaceFort),
        punishDissenters: withLogging("punishDissenters", punishDissenters),
        convertMonarch: withLogging("convertMonarch", convertMonarch),
        influencePrelates: withLogging("influencePrelates", influencePrelates),
        trainTroops: withLogging("trainTroops", trainTroops),
        discardFoWCard: withLogging("discardFoWCard", discardFoWCard),
        flipCards: withLogging("flipCards", flipCards),
        buildSkyships: withLogging("buildSkyships", buildSkyships),
        conscriptLevies: withLogging("conscriptLevies", conscriptLevies),
        passFleetInfoToPlayerInfo: withLogging("passFleetInfoToPlayerInfo", passFleetInfoToPlayerInfo),
        deployFleet: withLogging("deployFleet", deployFleet),
        transferBetweenFleets: withLogging("transferBetweenFleets", transferBetweenFleets),
        sellSkyships: withLogging("sellSkyships", sellSkyships),
        sellBuilding: withLogging("sellBuilding", sellBuilding),
        transferOutpost: withLogging("transferOutpost", transferOutpost),
        proposeDeal: withLogging("proposeDeal", proposeDeal),
        acceptDeal: withLogging("acceptDeal", acceptDeal),
        rejectDeal: withLogging("rejectDeal", rejectDeal),
        enableDispatchButtons: withLogging("enableDispatchButtons", enableDispatchButtons),
        issueHolyDecree: withLogging("issueHolyDecree", issueHolyDecree),
        declareSmugglerGood: withLogging("declareSmugglerGood", declareSmugglerGood),
        pass: withLogging("pass", pass),
      },
      onEnd: (context) => {
        Object.values(context.G.playerInfo).forEach((playerInfo: any) => {
          playerInfo.passed = false;
        });
      },
      next: "aerial_battle",
    },
    aerial_battle: {
      onBegin: (context) => {
        if (context.G._halted) return;
        if (checkLoopGuard(context, "aerial_battle")) return;
        phaseLog.info("aerial_battle", { round: context.G.round });
        findNextBattle(context.G, context.events);
      },
      turn: {
        onBegin: (context) => {
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
      next: "plunder_legends",
      moves: {
        doNotAttack: withLogging("doNotAttack", doNotAttack),
        attackOtherPlayersFleet: withLogging("attackOtherPlayersFleet", attackOtherPlayersFleet),
        retaliate: withLogging("retaliate", retaliate),
        evadeAttackingFleet: withLogging("evadeAttackingFleet", evadeAttackingFleet),
        drawCard: withLogging("drawCard", drawCard),
        pickCard: withLogging("pickCard", pickCard),
        relocateDefeatedFleet: withLogging("relocateDefeatedFleet", relocateDefeatedFleet),
      },
    },
    ground_battle: {
      onBegin: (context) => {
        if (context.G._halted) return;
        if (checkLoopGuard(context, "ground_battle")) return;
        phaseLog.info("ground_battle", { round: context.G.round });
        findNextGroundBattle(context.G, context.events);
      },
      turn: {
        onBegin: (context) => {
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
      next: "conquest",
      moves: {
        attackPlayersBuilding: withLogging("attackPlayersBuilding", attackPlayersBuilding),
        doNotGroundAttack: withLogging("doNotGroundAttack", doNotGroundAttack),
        defendGroundAttack: withLogging("defendGroundAttack", defendGroundAttack),
        garrisonTroops: withLogging("garrisonTroops", garrisonTroops),
        yieldToAttacker: withLogging("yieldToAttacker", yieldToAttacker),
        drawCard: withLogging("drawCard", drawCard),
        pickCard: withLogging("pickCard", pickCard),
      },
    },
    plunder_legends: {
      onBegin: (context) => {
        if (checkLoopGuard(context, "plunder_legends")) return;
        phaseLog.info("plunder_legends", { round: context.G.round });
        context.G.stage = "plunder legends";
        findNextPlunder(context.G, context.events);
      },
      moves: {
        plunder: withLogging("plunder", plunder),
        doNotPlunder: withLogging("doNotPlunder", doNotPlunder),
      },
      next: "ground_battle",
      turn: {
        onBegin: (context) => {
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
    },
    conquest: {
      onBegin: (context) => {
        if (checkLoopGuard(context, "conquest")) return;
        phaseLog.info("conquest", { round: context.G.round });
        context.G.stage = "attack or pass";
      },
      turn: {
        onBegin: (context) => {
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
      moves: {
        coloniseLand: withLogging("coloniseLand", coloniseLand),
        constructOutpost: withLogging("constructOutpost", constructOutpost),
        doNothing: withLogging("doNothing", doNothing),
        drawCardConquest: withLogging("drawCardConquest", drawCardConquest),
        pickCardConquest: withLogging("pickCardConquest", pickCardConquest),
        garrisonTroops: withLogging("garrisonTroops", garrisonTroops),
      },
      next: "election",
    },
    election: {
      turn: {
        activePlayers: { all: "voting", moveLimit: 1 },
        stages: {
          voting: {
            moves: { vote: withLogging("vote", vote) },
          },
        },
      },
      onBegin: (context) => {
        if (checkLoopGuard(context, "election")) return;
        phaseLog.info("election", { round: context.G.round });
        context.G.electionResults = {};
        context.G.hasVoted = [];
        context.G.voteSubmitted = {};
      },
      next: "resolution",
    },
    resolution: {
      turn: { order: TurnOrder.CUSTOM_FROM("turnOrder") },
      onBegin: (context) => {
        if (checkLoopGuard(context, "resolution")) return;
        phaseLog.info("resolution", { round: context.G.round });
        // Step 1: Infidel Fleet targeting + movement
        const hasCombat = prepareInfidelFleetCombat(context.G);

        if (hasCombat) {
          // Interactive: target player chooses fight or evade
          context.G.stage = "infidel_fleet_combat";
          context.events.endTurn({
            next: context.G.infidelFleetCombat!.targetPlayerID,
          });
        } else {
          // No Fleet combat — continue to deferred events, rebellions, invasion
          continueResolution(context.G, context.events);
        }
      },
      onEnd: (context) => {
        resolveRound(context.G, context.events, context.random);
      },
      moves: {
        retrieveFleets: withLogging("retrieveFleets", retrieveFleets),
        commitRebellionTroops: withLogging("commitRebellionTroops", commitRebellionTroops),
        contributeToRebellion: withLogging("contributeToRebellion", contributeToRebellion),
        nominateCaptainGeneral: withLogging("nominateCaptainGeneral", nominateCaptainGeneral),
        contributeToGrandArmy: withLogging("contributeToGrandArmy", contributeToGrandArmy),
        respondToInfidelFleet: withLogging("respondToInfidelFleet", respondToInfidelFleet),
        offerBuyoffGold: withLogging("offerBuyoffGold", offerBuyoffGold),
        commitDeferredBattleCard: withLogging("commitDeferredBattleCard", commitDeferredBattleCard),
      },
      next: "reset",
    },
    reset: {
      turn: { order: TurnOrder.ONCE },
      onBegin: (context) => {
        if (checkLoopGuard(context, "reset")) return;
        phaseLog.info("reset", { round: context.G.round });
        // Recompute turn order from alterPlayerOrder choices
        const currentTurnOrder = [...context.ctx.playOrder];
        let newTurnOrder: string[] = [];
        Object.values(context.G.boardState.pendingPlayerOrder).forEach(
          (id, index) => {
            if (index < context.ctx.playOrder.length) {
              if (id) {
                newTurnOrder.splice(currentTurnOrder.indexOf(id), 1);
                newTurnOrder.push(id);
              } else {
                newTurnOrder.push(currentTurnOrder.splice(0, 1)[0]);
              }
            }
          }
        );
        newTurnOrder.push(...currentTurnOrder);
        if (newTurnOrder.length !== context.ctx.playOrder.length) {
          throw Error(`Something has gone wrong when updating the player order.
          old order: ${context.ctx.playOrder}
          new order: ${newTurnOrder}`);
        } else {
          context.G.turnOrder = newTurnOrder;
        }

        // Return counsellors from action board slots
        Object.entries(context.G.boardState).forEach(
          ([key, gameStateObject]: [string, any]) => {
            if (key === "foundBuildings") {
              Object.values(gameStateObject).forEach((idArray: any) => {
                idArray.forEach((id: string) => {
                  context.G.playerInfo[id].resources.counsellors += 1;
                });
              });
            } else if (key === "issueHolyDecree") {
              context.G.boardState[key] = false;
            } else {
              Object.values(gameStateObject).forEach((id: any) => {
                if (id) {
                  context.G.playerInfo[id].resources.counsellors += 1;
                }
              });
            }
          }
        );

        // Reset action board
        context.G.boardState = { ...initialBoardState };

        // Return counsellors from player board slots
        Object.values(context.G.playerInfo).forEach((player: any) => {
          Object.values(player.playerBoardCounsellorLocations).forEach(
            (counsellor, index) => {
              if (counsellor && index !== 3) {
                player.resources.counsellors += 1;
                counsellor = false;
              }
            }
          );
          player.playerBoardCounsellorLocations.buildSkyships = false;
          player.playerBoardCounsellorLocations.conscriptLevies = false;
          player.playerBoardCounsellorLocations.dispatchSkyshipFleet = false;
          player.playerBoardCounsellorLocations.dispatchDisabled = false;
        });

        context.events.endPhase();
      },
      moves: {},
      next: "events",
    },
  },
  maxPlayers: 6,
  minPlayers: 1,
};

export { MyGame };
