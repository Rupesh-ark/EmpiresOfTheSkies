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
import setTurnCompleteFalse from "./moves/setTurnCompleteFalse";

import { findNextBattle, findNextGroundBattle, findNextPlunder } from "./helpers/findNext";
import { TurnOrder } from "boardgame.io/core";
import resolveRound from "./helpers/resolveRound";
import pickLegacyCard from "./moves/pickLegacyCard";
import pickKingdomAdvantageCard from "./moves/kingdomAdvantage/pickKingdomAdvantageCard";
import chooseEventCard from "./moves/events/chooseEventCard";
import resolveEventChoice from "./moves/events/resolveEventChoice";
import { ALL_EVENT_CARD_NAMES } from "./helpers/eventCardDefinitions";
import { resolveRebellionEvent, setupNextRebellion } from "./helpers/resolveRebellion";
import commitRebellionTroops from "./moves/events/commitRebellionTroops";
import nominateCaptainGeneral from "./moves/events/nominateCaptainGeneral";
import contributeToGrandArmy from "./moves/events/contributeToGrandArmy";
import { checkForInvasion, getArchprelateForNomination } from "./helpers/resolveInvasion";
import { logEvent } from "./helpers/stateUtils";
import { resolveDeferredBattle } from "./helpers/resolveDeferredBattles";
import { resolveInfidelFleet } from "./helpers/resolveInfidelFleet";

const MyGame: Game<MyGameState> = {
  turn: { minMoves: 1 },
  name: "empires-of-the-skies",
  setup: ({ ctx }: { ctx: Ctx }): MyGameState => {
    const mapState: MapState = {
      currentTileArray: getRandomisedMapTileArray(),
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
    const contingentPool = [...CONTINGENT_COUNTERS];
    for (let i = contingentPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [contingentPool[i], contingentPool[j]] = [contingentPool[j], contingentPool[i]];
    }

    // Shuffle Infidel Host counter pool
    const infidelHostPool = INFIDEL_HOST_COUNTERS.map((c) => ({ ...c }));
    for (let i = infidelHostPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [infidelHostPool[i], infidelHostPool[j]] = [infidelHostPool[j], infidelHostPool[i]];
    }

    // Shuffle event deck and deal EVENT_HAND_SIZE cards to each player
    const eventDeck = [...ALL_EVENT_CARD_NAMES];
    for (let i = eventDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eventDeck[i], eventDeck[j]] = [eventDeck[j], eventDeck[i]];
    }
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
        fortuneOfWarCards: fullResetFortuneOfWarCardDeck(),
        discardedFortuneOfWarCards: [],
        kingdomAdvantagePool: [...ALL_KA_CARDS],
        legacyDeck: [],
      },
      stage: "discovery",
      electionResults: {},
      hasVoted: [],
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
      pendingDeal: undefined,
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
    discoverTile,
    alterPlayerOrder,
    recruitCounsellors,
    recruitRegiments,
    purchaseSkyships,
    foundBuildings,
    increaseHeresy,
    increaseOrthodoxy,
    checkAndPlaceFort,
    punishDissenters,
    convertMonarch,
    influencePrelates,
    trainTroops,
    flipCards,
    buildSkyships,
    conscriptLevies,
    passFleetInfoToPlayerInfo,
    deployFleet,
    enableDispatchButtons,
    issueHolyDecree,
    pass,
    attackOtherPlayersFleet,
    evadeAttackingFleet,
    doNotAttack,
    retaliate,
    drawCard,
    pickCard,
    relocateDefeatedFleet,
    plunder,
    doNotPlunder,
    attackPlayersBuilding,
    doNotGroundAttack,
    defendGroundAttack,
    garrisonTroops,
    yieldToAttacker,
    setTurnCompleteFalse,
    chooseEventCard,
    resolveEventChoice,
    commitRebellionTroops,
    nominateCaptainGeneral,
    contributeToGrandArmy,
  },
  phases: {
    kingdom_advantage: {
      start: true,
      moves: { pickKingdomAdvantageCard },
      next: "legacy_card",
      onBegin: (context) => {
        context.G.cardDecks.kingdomAdvantagePool = context.random.Shuffle(
          context.G.cardDecks.kingdomAdvantagePool
        );
      },
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
      moves: { pickLegacyCard },
      next: "events",
      onBegin: (context) => {
        context.G.stage = "pick legacy card";
        const cards: LegacyCardInfo[] = [...LEGACY_CARDS];
        Object.values(context.G.playerInfo).forEach((player) => {
          for (let i = 0; i < 3; i++) {
            let randomIndex = Math.floor(Math.random() * cards.length);
            const card = cards.splice(randomIndex, 1);
            player.legacyCardOptions.push(card[0]);
          }
        });
        // Store remaining cards for Royal Succession event
        context.G.cardDecks.legacyDeck = cards;
      },
    },
    events: {
      turn: {
        order: TurnOrder.CUSTOM_FROM("turnOrder"),
      },
      onBegin: (context) => {
        context.G.stage = "events";
        context.G.eventState.taxModifier = 0;
        context.G.eventState.chosenCards = [];
        context.G.eventState.resolvedEvent = null;
        context.G.eventState.cannotConvertThisRound = [];
        console.log("Events phase has begun");
      },
      moves: { chooseEventCard, resolveEventChoice },
      next: "discovery",
    },
    discovery: {
      onBegin: (context) => {
        context.G.round += 1;
        console.log(`Round: ${context.G.round}`);
        context.ctx.playOrderPos = 0;
        context.G.stage = "discovery";
        console.log("Discovery phase has begun");

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
        discoverTile,
        pass,
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
        context.G.stage = "taxes";
        console.log("Taxes phase has begun");

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
        context.G.firstTurnOfRound = true;
        context.G.stage = "actions";
        console.log("Actions phase has begun");
      },
      turn: {
        onBegin: (context) => {
          console.log("new turn in action phase");
          if (context.G.firstTurnOfRound && context.ctx.playOrderPos !== 0) {
            context.events.endTurn({ next: context.ctx.playOrder[0] });
          }

          context.G.firstTurnOfRound = false;
          if (context.G.playerInfo[context.ctx.currentPlayer].passed === true) {
            context.events.endTurn();
          }
        },
        order: TurnOrder.CUSTOM_FROM("turnOrder"),
      },
      moves: {
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
        setTurnCompleteFalse,
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
        console.log("Aerial battle phase has begun");
        findNextBattle(context.G, context.events);
      },
      turn: {
        onBegin: (context) => {
          console.log(
            `It is now player ${context.ctx.currentPlayer}'s turn in the aerial battle phase`
          );
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
      next: "ground_battle",
      moves: {
        doNotAttack,
        attackOtherPlayersFleet,
        retaliate,
        evadeAttackingFleet,
        drawCard,
        pickCard,
        relocateDefeatedFleet,
      },
    },
    ground_battle: {
      onBegin: (context) => {
        console.log("Ground battle phase has begun");
        findNextGroundBattle(context.G, context.events);
      },
      turn: {
        onBegin: (context) => {
          console.log(
            `It is now player ${context.ctx.currentPlayer}'s turn in the ground battle phase`
          );
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
      next: "plunder_legends",
      moves: {
        attackPlayersBuilding,
        doNotGroundAttack,
        defendGroundAttack,
        garrisonTroops,
        yieldToAttacker,
      },
    },
    plunder_legends: {
      onBegin: (context) => {
        context.G.stage = "plunder legends";
        console.log("Plunder legends phase has begun");

        findNextPlunder(context.G, context.events);
      },
      moves: { plunder, doNotPlunder },
      next: "conquest",
      turn: {
        onBegin: (context) => {
          console.log(
            `it is now player ${context.ctx.currentPlayer}'s time to plunder`
          );
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
        context.G.stage = "attack or pass";

        console.log("Conquests have begun");
      },
      turn: {
        onBegin: (context) => {
          console.log(
            `it is now player ${context.ctx.currentPlayer}'s time to conquer`
          );
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
      moves: {
        coloniseLand,
        constructOutpost,
        doNothing,
        drawCardConquest,
        pickCardConquest,
        garrisonTroops,
      },
      next: "election",
    },
    election: {
      onBegin: (context) => {
        context.G.electionResults = {};
        context.G.hasVoted = [];
      },
      moves: { vote },
      next: "resolution",
    },
    resolution: {
      turn: { order: TurnOrder.CUSTOM_FROM("turnOrder") },
      onBegin: (context) => {
        console.log("resolution phase has begun");

        // Infidel Fleet: reactivate, target, move, aerial combat
        resolveInfidelFleet(context.G);

        // Auto-resolve non-rebellion deferred events
        const pending = context.G.eventState.deferredEvents;
        const nonRebellions = pending.filter(
          (e) => !e.card.endsWith("_rebellion")
        );
        for (const event of nonRebellions) {
          resolveDeferredBattle(context.G, event);
        }
        context.G.eventState.deferredEvents = pending.filter((e) =>
          e.card.endsWith("_rebellion")
        );

        // Check if any rebellions need interactive resolution
        const hasRebellions = context.G.eventState.deferredEvents.length > 0;

        if (hasRebellions && setupNextRebellion(context.G)) {
          // Interactive rebellion — target player gets a turn
          context.G.stage = "rebellion";
          context.events.endTurn({
            next: context.G.currentRebellion!.event.targetPlayerID,
          });
        } else {
          // No rebellions — check for invasion
          const invasionTriggered = checkForInvasion(context.G);
          if (invasionTriggered) {
            const archprelate = getArchprelateForNomination(context.G);
            if (archprelate) {
              context.G.stage = "invasion_nominate";
              context.events.endTurn({ next: archprelate });
            } else {
              context.G.stage = "retrieve fleets";
            }
          } else {
            context.G.stage = "retrieve fleets";
          }
        }
      },
      onEnd: (context) => {
        resolveRound(context.G, context.events, context.random);
        console.log(`Round number:${context.G.round}`);
      },
      moves: { retrieveFleets, commitRebellionTroops, nominateCaptainGeneral, contributeToGrandArmy },
      next: "reset",
    },
    reset: {
      turn: { order: TurnOrder.ONCE },
      onBegin: (context) => {
        console.log("Reset phase has begun");

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
                  console.log(
                    `adding counsellor to player ${id} info for a founded ${key}`
                  );
                  context.G.playerInfo[id].resources.counsellors += 1;
                });
              });
            } else if (key === "issueHolyDecree") {
              context.G.boardState[key] = false;
            } else {
              Object.values(gameStateObject).forEach((id: any) => {
                if (id) {
                  console.log(
                    `adding counsellor to player ${id} info for a ${key} button`
                  );
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
                console.log(
                  "adding counsellor to player info for a player board button"
                );
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
