import type { Game, Ctx } from "boardgame.io";

import { LegacyCardInfo, MyGameState, MapState } from "./types";

import { ALL_KA_CARDS, CONTINGENT_COUNTERS, EVENT_HAND_SIZE, MAX_ROUNDS, INFIDEL_HOST_COUNTERS } from "./data/gameData";
import { filterKAPool, classifyEventDeck } from "./helpers/manufacturedFunSeed";
import { initialBoardState, initialBattleMapState, createInitialBoardState } from "./setup/boardSetup";
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
  resetBattleCheckCount,
} from "./helpers/helpers";
import trainTroops from "./moves/actions/trainTroops";
import confirmAction from "./moves/actions/confirmAction";
import discardFoWCard from "./moves/actions/discardFoWCard";
import drawFoWCards from "./moves/actions/drawFoWCards";
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
import sendAgitators from "./moves/actions/sendAgitators";
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


// findNext functions now called via resolutionFlow walker
import { TurnOrder } from "boardgame.io/core";
import resolveRound from "./helpers/resolveRound";
import pickLegacyCard from "./moves/pickLegacyCard";
import pickKingdomAdvantageCard from "./moves/kingdomAdvantage/pickKingdomAdvantageCard";
import chooseEventCard from "./moves/events/chooseEventCard";
import resolveEventChoice from "./moves/events/resolveEventChoice";
import immediateElectionVote from "./moves/events/immediateElectionVote";
import { ALL_EVENT_CARD_NAMES } from "./helpers/eventCardDefinitions";
// prepareInfidelFleetCombat now called via resolutionFlow walker
import { beginResolution, getResolutionTarget } from "./helpers/resolutionFlow";
import respondToInfidelFleet from "./moves/events/respondToInfidelFleet";
import commitRebellionTroops from "./moves/events/commitRebellionTroops";
import contributeToRebellion from "./moves/events/contributeToRebellion";
import offerBuyoffGold from "./moves/events/offerBuyoffGold";
import nominateCaptainGeneral from "./moves/events/nominateCaptainGeneral";
import commitDeferredBattleCard from "./moves/events/commitDeferredBattleCard";
import contributeToGrandArmy from "./moves/events/contributeToGrandArmy";
import { logEvent, allPlayersPassed, calculateMercy, nextUnpassedPlayer } from "./helpers/stateUtils";
import { wrapMove, withPhaseGuard, withPhaseReset, checkLoopGuard } from "./helpers/moveWrapper";

import { setStage, isStage } from "./helpers/stageUtils";
import type { GameStage } from "./types";
import { createLogger } from "./helpers/logger";

const phaseLog = createLogger("phase");
const budgetLog = createLogger("turn-budget");

const TURN_ENDING_LIMIT = 550;
let turnEndingCounter = 0;
let turnEndingRound = 0;

const turnBudgetPlugin = {
  name: "turn-budget",
  fnWrap: (fn: (...args: any[]) => any, methodType: string) =>
    (context: any, ...args: any[]) => {
      const events = context.events;
      const G: MyGameState = context.G;

      if (events && !events._budgetWrapped) {
        const origEndTurn = events.endTurn?.bind(events);
        const origEndPhase = events.endPhase?.bind(events);

        if (origEndTurn) {
          events.endTurn = (endTurnArgs?: any) => {
            turnEndingCounter++;
            const phase = context.ctx?.phase ?? "?";
            const stage = G?.stage ? `${G.stage.phase}/${G.stage.sub}` : "?";

            if (turnEndingCounter >= TURN_ENDING_LIMIT) {
              budgetLog.error("BUDGET EXCEEDED — halting game", {
                count: turnEndingCounter,
                type: "endTurn",
                method: methodType,
                phase,
                stage,
                round: turnEndingRound,
                turn: context.ctx?.turn,
                next: endTurnArgs?.next,
              });
              return;
            }

            if (turnEndingCounter % 50 === 0) {
              budgetLog.warn("endTurn milestone", {
                count: turnEndingCounter,
                method: methodType,
                phase,
                stage,
                round: turnEndingRound,
                turn: context.ctx?.turn,
                next: endTurnArgs?.next,
              });
            }

            return origEndTurn(endTurnArgs);
          };
        }

        if (origEndPhase) {
          events.endPhase = (...phaseArgs: any[]) => {
            turnEndingCounter++;
            const phase = context.ctx?.phase ?? "?";
            const stage = G?.stage ? `${G.stage.phase}/${G.stage.sub}` : "?";

            if (turnEndingCounter >= TURN_ENDING_LIMIT) {
              budgetLog.error("BUDGET EXCEEDED — halting game", {
                count: turnEndingCounter,
                type: "endPhase",
                method: methodType,
                phase,
                stage,
                round: turnEndingRound,
                turn: context.ctx?.turn,
              });
              return;
            }

            if (turnEndingCounter % 50 === 0) {
              budgetLog.warn("endPhase milestone", {
                count: turnEndingCounter,
                method: methodType,
                phase,
                stage,
                round: turnEndingRound,
                turn: context.ctx?.turn,
              });
            }

            return origEndPhase(...phaseArgs);
          };
        }

        events._budgetWrapped = true;
      }

      const result = fn(context, ...args);

      if (events) events._budgetWrapped = false;

      return result;
    },
};

/** Call from discovery.onBegin to reset the per-round budget counter. */
export function resetTurnEndingBudget(round: number): void {
  if (turnEndingCounter > 0) {
    budgetLog.info("round budget summary", {
      count: turnEndingCounter,
      round: turnEndingRound,
    });
  }
  turnEndingCounter = 0;
  turnEndingRound = round;
}

/** Read-only access for tests / diagnostics. */
export function getTurnEndingCount(): number {
  return turnEndingCounter;
}

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
      routeSkyships: {},
    };

    const playerInfoMap = buildPlayerInfoMap(ctx);

    const assignedKingdoms = new Set(
      Object.values(playerInfoMap).map((p) => p.kingdomName)
    );
    const ALL_PLAYER_KINGDOMS = [
      "Angland", "Gallois", "Castillia", "Normark", "Ostreich", "Constantium",
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

    // Split event deck into early/late epochs and deal from early deck
    const { earlyDeck, lateDeck, log: eventSeedLog } = classifyEventDeck(
      ALL_EVENT_CARD_NAMES, ctx.numPlayers, random.Shuffle
    );
    for (const id of ctx.playOrder) {
      playerInfoMap[id].resources.eventCards = earlyDeck.splice(0, EVENT_HAND_SIZE);
    }

    return {
      playerInfo: playerInfoMap,
      mapState: mapState,
      boardState: createInitialBoardState(),
      cardDecks: {
        fortuneOfWarCards: random.Shuffle(fullResetFortuneOfWarCardDeck()),
        discardedFortuneOfWarCards: [],
        kingdomAdvantagePool: [...ALL_KA_CARDS],
        legacyDeck: [],
      },
      stage: { phase: "setup", sub: "kingdom_advantage" } as GameStage,
      electionResults: {},
      hasVoted: [],
      voteSubmitted: {},
      consecutiveArchprelateWins: 0,
      round: 0,
      finalRound: MAX_ROUNDS,
      firstTurnOfRound: true,
      mustContinueDiscovery: false,
      nprCathedrals,
      turnOrder: ctx.playOrder,
      validFortLocations: [],
      possibleDefenders: [],
      validRelocationTiles: [],
      troopsAvailableForGarrison: { regiments: 0, elites: 0, levies: 0 },
      battleResult: null,
      failedConquests: [],
      contingentPool,
      infidelHostPool,
      accumulatedHosts: [],
      infidelFleet: null,
      gameLog: eventSeedLog.map((msg) => ({ round: 0, message: msg })),
      currentRebellion: null,
      currentInvasion: null,
      infidelFleetCombat: null,
      currentDeferredBattle: null,
      pendingDeal: undefined,
      mercyGold: {},
      _loopGuard: 0,
      _halted: false,
      eventState: {
        deck: earlyDeck,
        lateDeck,
        chosenCards: [],
        eventContributions: {},
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
        royalPatronageActive: false,
        raceToDiscoveryCounters: null,
        immediateElectionPending: false,
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
    drawFoWCards: wrapMove("drawFoWCards", drawFoWCards),
    confirmAction: wrapMove("confirmAction", confirmAction),
    flipCards: wrapMove("flipCards", flipCards),
    buildSkyships: wrapMove("buildSkyships", buildSkyships),
    conscriptLevies: wrapMove("conscriptLevies", conscriptLevies),
    passFleetInfoToPlayerInfo: wrapMove("passFleetInfoToPlayerInfo", passFleetInfoToPlayerInfo),
    deployFleet: wrapMove("deployFleet", deployFleet),
    enableDispatchButtons: wrapMove("enableDispatchButtons", enableDispatchButtons),
    issueHolyDecree: wrapMove("issueHolyDecree", issueHolyDecree),
    garrisonTransfer: wrapMove("garrisonTransfer", garrisonTransfer),
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
    setup: {
      start: true,
      moves: {
        pickKingdomAdvantageCard: wrapMove("pickKingdomAdvantageCard", pickKingdomAdvantageCard),
        pickLegacyCard: wrapMove("pickLegacyCard", pickLegacyCard),
      },
      next: "events",
      onBegin: (context) => {
        phaseLog.info("setup", { round: context.G.round });
        setStage(context.G, "setup", "kingdom_advantage");
        const { pool: filteredPool, log: kaLog } = filterKAPool(
          context.G.cardDecks.kingdomAdvantagePool,
          context.ctx.numPlayers,
          context.random.Shuffle,
        );
        context.G.cardDecks.kingdomAdvantagePool = context.random.Shuffle(filteredPool);
        for (const msg of kaLog) logEvent(context.G, msg);
      },
      turn: {
        order: {
          first: () => 0,
          next: (context) =>
            (context.ctx.playOrderPos + 1) % context.ctx.playOrder.length,
          playOrder: (context) => [...context.ctx.playOrder].reverse(),
        },
      },
    },
    events: {
      turn: {
        order: TurnOrder.CUSTOM_FROM("turnOrder"),
      },
      onBegin: withPhaseGuard("events", (context) => {
        phaseLog.info("events", { round: context.G.round });
        setStage(context.G, "events", "default");
        context.G.eventState.taxModifier = 0;
        context.G.eventState.chosenCards = [];
        context.G.eventState.eventContributions = {};
        context.G.eventState.resolvedEvent = null;
        context.G.eventState.cannotConvertThisRound = [];
        context.G.eventState.royalPatronageActive = false;
        context.G.eventState.raceToDiscoveryCounters = null;

        // Merge late-game events into active deck from round 2 onward
        if (context.G.round >= 2 && context.G.eventState.lateDeck.length > 0) {
          const mergeCount = context.G.eventState.lateDeck.length;
          context.G.eventState.deck.push(...context.G.eventState.lateDeck);
          context.G.eventState.lateDeck = [];
          context.G.eventState.deck = context.random.Shuffle(context.G.eventState.deck);
          logEvent(context.G, `Event deck: merged ${mergeCount} late-game cards into active deck`);
        }
      }),
      moves: {
        chooseEventCard: wrapMove("chooseEventCard", chooseEventCard),
        resolveEventChoice: wrapMove("resolveEventChoice", resolveEventChoice),
        immediateElectionVote: wrapMove("immediateElectionVote", immediateElectionVote),
          },
      next: "discovery",
    },
    discovery: {
      onBegin: (context) => {
        // Reset the loop guard at the start of each new round, then check.
        context.G._loopGuard = 0;
        context.G._halted = false;
        resetBattleCheckCount();
        resetTurnEndingBudget(context.G.round + 1);
        if (checkLoopGuard(context, "discovery")) return;
        phaseLog.info("discovery", { round: context.G.round + 1 });
        context.G.round += 1;
        context.ctx.playOrderPos = 0;
        setStage(context.G, "discovery", "default");

        context.G.firstTurnOfRound = true;

        Object.values(context.G.playerInfo).forEach((playerInfo) => {
          playerInfo.passed = false;
          playerInfo.piracyIntent = "tax"; // reset each round
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
        context.G.mustContinueDiscovery = false;
        Object.values(context.G.playerInfo).forEach((playerInfo) => {
          playerInfo.passed = false;
        });

        // Race to Discovery: score the player who discovered the most tiles
        const counters = context.G.eventState.raceToDiscoveryCounters;
        if (counters) {
          const entries = Object.entries(counters).sort((a, b) => b[1] - a[1]);
          if (entries.length >= 2 && entries[0][1] > entries[1][1]) {
            const winnerID = entries[0][0];
            const bonusVP = entries[0][1] - entries[1][1];
            context.G.playerInfo[winnerID].resources.victoryPoints += bonusVP;
            logEvent(
              context.G,
              `Race to Discovery: ${context.G.playerInfo[winnerID].kingdomName} discovered most tiles (+${bonusVP} VP)`,
            );
          } else if (entries.length >= 2 && entries[0][1] === entries[1][1]) {
            // Tie — break by IPO (first in turn order wins)
            const tiedCount = entries[0][1];
            if (tiedCount > 0) {
              const tiedIDs = entries.filter(([, c]) => c === tiedCount).map(([id]) => id);
              const winnerID = context.G.turnOrder.find((id: string) => tiedIDs.includes(id));
              if (winnerID && entries.length >= 2) {
                // Winner by IPO gets +1 VP per tile beyond second-most non-tied
                const secondBest = entries.find(([id, c]) => !tiedIDs.includes(id))?.[1] ?? 0;
                const bonusVP = tiedCount - secondBest;
                if (bonusVP > 0) {
                  context.G.playerInfo[winnerID].resources.victoryPoints += bonusVP;
                  logEvent(
                    context.G,
                    `Race to Discovery: ${context.G.playerInfo[winnerID].kingdomName} wins tie by IPO (+${bonusVP} VP)`,
                  );
                }
              }
            }
          }
          context.G.eventState.raceToDiscoveryCounters = null;
        }
      },
    },
    taxes: {
      turn: { order: TurnOrder.ONCE },
      onBegin: (context) => {
        if (context.G._halted) return;
        if (checkLoopGuard(context, "taxes")) return;
        phaseLog.info("taxes", { round: context.G.round });
        setStage(context.G, "taxes", "default");

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
        calculateMercy(context.G);
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
        setStage(context.G, "actions", "default");
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
              setStage(context.G, "actions", "default");
              context.events.endPhase();
            } else {
              const next = nextUnpassedPlayer(context.G, context.ctx.currentPlayer);
              context.events.endTurn(next ? { next } : undefined);
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
        drawFoWCards: wrapMove("drawFoWCards", drawFoWCards),
        confirmAction: wrapMove("confirmAction", confirmAction),
        discardFoWCard: wrapMove("discardFoWCard", discardFoWCard),
        flipCards: wrapMove("flipCards", flipCards),
        buildSkyships: wrapMove("buildSkyships", buildSkyships),
        conscriptLevies: wrapMove("conscriptLevies", conscriptLevies),
        passFleetInfoToPlayerInfo: wrapMove("passFleetInfoToPlayerInfo", passFleetInfoToPlayerInfo),
        deployFleet: wrapMove("deployFleet", deployFleet),
        moveFleet: wrapMove("moveFleet", moveFleet),
        transferBetweenFleets: wrapMove("transferBetweenFleets", transferBetweenFleets),
        sellSkyships: wrapMove("sellSkyships", sellSkyships),
        sellBuilding: wrapMove("sellBuilding", sellBuilding),
        transferOutpost: wrapMove("transferOutpost", transferOutpost),
        proposeDeal: wrapMove("proposeDeal", proposeDeal),
        acceptDeal: wrapMove("acceptDeal", acceptDeal),
        rejectDeal: wrapMove("rejectDeal", rejectDeal),
        enableDispatchButtons: wrapMove("enableDispatchButtons", enableDispatchButtons),
        issueHolyDecree: wrapMove("issueHolyDecree", issueHolyDecree),
        garrisonTransfer: wrapMove("garrisonTransfer", garrisonTransfer),
        sendAgitators: wrapMove("sendAgitators", sendAgitators),
        declareSmugglerGood: wrapMove("declareSmugglerGood", declareSmugglerGood),
        pass: wrapMove("pass", pass),
          },
      onEnd: (context) => {
        Object.values(context.G.playerInfo).forEach((playerInfo) => {
          playerInfo.passed = false;
        });
      },
      next: "resolution",
    },
    resolution: {
      turn: {
        order: TurnOrder.CUSTOM_FROM("turnOrder"),
        onBegin: (context) => {
          if (context.G._halted) return;
          const sub = context.G.stage.sub;

          if (sub === "election" || sub === "conquest"
              || sub === "rebellion_rival_support"
              || sub === "invasion_contribute" || sub === "invasion_buyoff") return;

          // Retrieve fleets — auto-skip players with nothing to retrieve
          if (sub === "retrieve_fleets") {
            const playerID = context.ctx.currentPlayer;
            const player = context.G.playerInfo[playerID];
            const hasRetrievableFleets = player.fleetInfo.some(
              (f) => f.skyships > 0 && (f.location[0] !== 4 || f.location[1] !== 0)
            );
            if (!hasRetrievableFleets || player.passed) {
              player.passed = true;
              if (allPlayersPassed(context.G)) {
                context.events.endPhase();
              } else {
                const next = nextUnpassedPlayer(context.G, context.ctx.currentPlayer);
                context.events.endTurn(next ? { next } : undefined);
              }
            }
            return;
          }

          // Post-election stages — redirect to correct player
          const target = getResolutionTarget(context.G);
          if (target) {
            if (target !== context.ctx.currentPlayer) {
              context.events.endTurn({ next: target });
            }
            // Correct player has the turn — let them act (don't fall through to battle check)
            return;
          }

          // Battle sub-stages — route attacker/defender/victor
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
      onBegin: (context) => {
        if (context.G._halted) return;
        if (checkLoopGuard(context, "resolution")) return;
        phaseLog.info("resolution", { round: context.G.round });
        // Walk the full resolution sequence: aerial → plunder → ground → conquest → election → post-election → retrieve
        beginResolution(context.G, context.events, true);
      },
      onEnd: (context) => {
        resolveRound(context.G, context.events, context.random);
      },
      moves: {
        // Aerial battle
        doNotAttack: wrapMove("doNotAttack", doNotAttack),
        attackOtherPlayersFleet: wrapMove("attackOtherPlayersFleet", attackOtherPlayersFleet),
        retaliate: wrapMove("retaliate", retaliate),
        evadeAttackingFleet: wrapMove("evadeAttackingFleet", evadeAttackingFleet),
        drawCard: wrapMove("drawCard", drawCard),
        pickCard: wrapMove("pickCard", pickCard),
        relocateDefeatedFleet: wrapMove("relocateDefeatedFleet", relocateDefeatedFleet),
        // Plunder
        plunder: wrapMove("plunder", plunder),
        doNotPlunder: wrapMove("doNotPlunder", doNotPlunder),
        // Ground battle
        attackPlayersBuilding: wrapMove("attackPlayersBuilding", attackPlayersBuilding),
        doNotGroundAttack: wrapMove("doNotGroundAttack", doNotGroundAttack),
        defendGroundAttack: wrapMove("defendGroundAttack", defendGroundAttack),
        yieldToAttacker: wrapMove("yieldToAttacker", yieldToAttacker),
        // Conquest
        coloniseLand: wrapMove("coloniseLand", coloniseLand),
        constructOutpost: wrapMove("constructOutpost", constructOutpost),
        doNothing: wrapMove("doNothing", doNothing),
        drawCardConquest: wrapMove("drawCardConquest", drawCardConquest),
        pickCardConquest: wrapMove("pickCardConquest", pickCardConquest),
        garrisonTroops: wrapMove("garrisonTroops", garrisonTroops),
        // Election
        vote: wrapMove("vote", vote),
        // Post-election resolution
        pass: wrapMove("pass", pass),
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
                currentTurnOrder.splice(currentTurnOrder.indexOf(id), 1);
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
        context.G.boardState = createInitialBoardState();

        // Return counsellors from player board slots and reset flags
        Object.values(context.G.playerInfo).forEach((player) => {
          const pb = player.playerBoardCounsellorLocations;
          // Return 1 counsellor for each used slot (dispatchDisabled is not a counsellor slot)
          if (pb.buildSkyships) player.resources.counsellors += 1;
          if (pb.conscriptLevies) player.resources.counsellors += 1;
          if (pb.dispatchSkyshipFleet) player.resources.counsellors += 1;
          if (pb.trainTroops) player.resources.counsellors += 1;
          // Reset all flags
          pb.buildSkyships = false;
          pb.conscriptLevies = false;
          pb.dispatchSkyshipFleet = false;
          pb.trainTroops = false;
          pb.dispatchDisabled = false;
          player.agitatorsSentThisRound = [];
        });

        context.events.endPhase();
      },
      moves: {},
      next: "events",
    },
  },
  maxPlayers: 6,
  minPlayers: 1,
  plugins: [turnBudgetPlugin],
};

export { MyGame };
