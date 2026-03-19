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
import { wrapMove, withPhaseGuard, withPhaseReset, checkLoopGuard } from "./helpers/moveWrapper";
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
    discoverTile: wrapMove("discoverTile", discoverTile),
    alterPlayerOrder: wrapMove("alterPlayerOrder", alterPlayerOrder),
    recruitCounsellors: wrapMove("recruitCounsellors", recruitCounsellors),
    recruitRegiments: wrapMove("recruitRegiments", recruitRegiments),
    purchaseSkyships: wrapMove("purchaseSkyships", purchaseSkyships),
    foundBuildings: wrapMove("foundBuildings", foundBuildings),
    increaseHeresy: wrapMove("increaseHeresy", increaseHeresy),
    increaseOrthodoxy: wrapMove("increaseOrthodoxy", increaseOrthodoxy),
    checkAndPlaceFort: wrapMove("checkAndPlaceFort", checkAndPlaceFort),
    punishDissenters: wrapMove("punishDissenters", punishDissenters),
    convertMonarch: wrapMove("convertMonarch", convertMonarch),
    influencePrelates: wrapMove("influencePrelates", influencePrelates),
    trainTroops: wrapMove("trainTroops", trainTroops),
    flipCards: wrapMove("flipCards", flipCards),
    buildSkyships: wrapMove("buildSkyships", buildSkyships),
    conscriptLevies: wrapMove("conscriptLevies", conscriptLevies),
    passFleetInfoToPlayerInfo: wrapMove("passFleetInfoToPlayerInfo", passFleetInfoToPlayerInfo),
    deployFleet: wrapMove("deployFleet", deployFleet),
    enableDispatchButtons: wrapMove("enableDispatchButtons", enableDispatchButtons),
    issueHolyDecree: wrapMove("issueHolyDecree", issueHolyDecree),
    pass: wrapMove("pass", pass),
    attackOtherPlayersFleet: wrapMove("attackOtherPlayersFleet", attackOtherPlayersFleet),
    evadeAttackingFleet: wrapMove("evadeAttackingFleet", evadeAttackingFleet),
    doNotAttack: wrapMove("doNotAttack", doNotAttack),
    retaliate: wrapMove("retaliate", retaliate),
    drawCard: wrapMove("drawCard", drawCard),
    pickCard: wrapMove("pickCard", pickCard),
    relocateDefeatedFleet: wrapMove("relocateDefeatedFleet", relocateDefeatedFleet),
    plunder: wrapMove("plunder", plunder),
    doNotPlunder: wrapMove("doNotPlunder", doNotPlunder),
    attackPlayersBuilding: wrapMove("attackPlayersBuilding", attackPlayersBuilding),
    doNotGroundAttack: wrapMove("doNotGroundAttack", doNotGroundAttack),
    defendGroundAttack: wrapMove("defendGroundAttack", defendGroundAttack),
    garrisonTroops: wrapMove("garrisonTroops", garrisonTroops),
    yieldToAttacker: wrapMove("yieldToAttacker", yieldToAttacker),
    chooseEventCard: wrapMove("chooseEventCard", chooseEventCard),
    resolveEventChoice: wrapMove("resolveEventChoice", resolveEventChoice),
    commitRebellionTroops: wrapMove("commitRebellionTroops", commitRebellionTroops),
    nominateCaptainGeneral: wrapMove("nominateCaptainGeneral", nominateCaptainGeneral),
    contributeToGrandArmy: wrapMove("contributeToGrandArmy", contributeToGrandArmy),
    respondToInfidelFleet: wrapMove("respondToInfidelFleet", respondToInfidelFleet),
    contributeToRebellion: wrapMove("contributeToRebellion", contributeToRebellion),
    offerBuyoffGold: wrapMove("offerBuyoffGold", offerBuyoffGold),
  },
  phases: {
    kingdom_advantage: {
      start: true,
      moves: { pickKingdomAdvantageCard: wrapMove("pickKingdomAdvantageCard", pickKingdomAdvantageCard) },
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
      moves: { pickLegacyCard: wrapMove("pickLegacyCard", pickLegacyCard) },
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
        chooseEventCard: wrapMove("chooseEventCard", chooseEventCard),
        resolveEventChoice: wrapMove("resolveEventChoice", resolveEventChoice),
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
        discoverTile: wrapMove("discoverTile", discoverTile),
        pass: wrapMove("pass", pass),
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
          currentPlayer.turnComplete = false;

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
        alterPlayerOrder: wrapMove("alterPlayerOrder", alterPlayerOrder),
        recruitCounsellors: wrapMove("recruitCounsellors", recruitCounsellors),
        recruitRegiments: wrapMove("recruitRegiments", recruitRegiments),
        purchaseSkyships: wrapMove("purchaseSkyships", purchaseSkyships),
        foundBuildings: wrapMove("foundBuildings", foundBuildings),
        foundFactory: wrapMove("foundFactory", foundFactory),
        increaseHeresy: wrapMove("increaseHeresy", increaseHeresy),
        increaseOrthodoxy: wrapMove("increaseOrthodoxy", increaseOrthodoxy),
        checkAndPlaceFort: wrapMove("checkAndPlaceFort", checkAndPlaceFort),
        punishDissenters: wrapMove("punishDissenters", punishDissenters),
        convertMonarch: wrapMove("convertMonarch", convertMonarch),
        influencePrelates: wrapMove("influencePrelates", influencePrelates),
        trainTroops: wrapMove("trainTroops", trainTroops),
        discardFoWCard: wrapMove("discardFoWCard", discardFoWCard),
        flipCards: wrapMove("flipCards", flipCards),
        buildSkyships: wrapMove("buildSkyships", buildSkyships),
        conscriptLevies: wrapMove("conscriptLevies", conscriptLevies),
        passFleetInfoToPlayerInfo: wrapMove("passFleetInfoToPlayerInfo", passFleetInfoToPlayerInfo),
        deployFleet: wrapMove("deployFleet", deployFleet),
        transferBetweenFleets: wrapMove("transferBetweenFleets", transferBetweenFleets),
        sellSkyships: wrapMove("sellSkyships", sellSkyships),
        sellBuilding: wrapMove("sellBuilding", sellBuilding),
        transferOutpost: wrapMove("transferOutpost", transferOutpost),
        proposeDeal: wrapMove("proposeDeal", proposeDeal),
        acceptDeal: wrapMove("acceptDeal", acceptDeal),
        rejectDeal: wrapMove("rejectDeal", rejectDeal),
        enableDispatchButtons: wrapMove("enableDispatchButtons", enableDispatchButtons),
        issueHolyDecree: wrapMove("issueHolyDecree", issueHolyDecree),
        declareSmugglerGood: wrapMove("declareSmugglerGood", declareSmugglerGood),
        pass: wrapMove("pass", pass),
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
        doNotAttack: wrapMove("doNotAttack", doNotAttack),
        attackOtherPlayersFleet: wrapMove("attackOtherPlayersFleet", attackOtherPlayersFleet),
        retaliate: wrapMove("retaliate", retaliate),
        evadeAttackingFleet: wrapMove("evadeAttackingFleet", evadeAttackingFleet),
        drawCard: wrapMove("drawCard", drawCard),
        pickCard: wrapMove("pickCard", pickCard),
        relocateDefeatedFleet: wrapMove("relocateDefeatedFleet", relocateDefeatedFleet),
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
        attackPlayersBuilding: wrapMove("attackPlayersBuilding", attackPlayersBuilding),
        doNotGroundAttack: wrapMove("doNotGroundAttack", doNotGroundAttack),
        defendGroundAttack: wrapMove("defendGroundAttack", defendGroundAttack),
        garrisonTroops: wrapMove("garrisonTroops", garrisonTroops),
        yieldToAttacker: wrapMove("yieldToAttacker", yieldToAttacker),
        drawCard: wrapMove("drawCard", drawCard),
        pickCard: wrapMove("pickCard", pickCard),
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
        plunder: wrapMove("plunder", plunder),
        doNotPlunder: wrapMove("doNotPlunder", doNotPlunder),
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
        coloniseLand: wrapMove("coloniseLand", coloniseLand),
        constructOutpost: wrapMove("constructOutpost", constructOutpost),
        doNothing: wrapMove("doNothing", doNothing),
        drawCardConquest: wrapMove("drawCardConquest", drawCardConquest),
        pickCardConquest: wrapMove("pickCardConquest", pickCardConquest),
        garrisonTroops: wrapMove("garrisonTroops", garrisonTroops),
      },
      next: "election",
    },
    election: {
      turn: {
        activePlayers: { all: "voting", moveLimit: 1 },
        stages: {
          voting: {
            moves: { vote: wrapMove("vote", vote) },
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
        retrieveFleets: wrapMove("retrieveFleets", retrieveFleets),
        commitRebellionTroops: wrapMove("commitRebellionTroops", commitRebellionTroops),
        contributeToRebellion: wrapMove("contributeToRebellion", contributeToRebellion),
        nominateCaptainGeneral: wrapMove("nominateCaptainGeneral", nominateCaptainGeneral),
        contributeToGrandArmy: wrapMove("contributeToGrandArmy", contributeToGrandArmy),
        respondToInfidelFleet: wrapMove("respondToInfidelFleet", respondToInfidelFleet),
        offerBuyoffGold: wrapMove("offerBuyoffGold", offerBuyoffGold),
        commitDeferredBattleCard: wrapMove("commitDeferredBattleCard", commitDeferredBattleCard),
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
