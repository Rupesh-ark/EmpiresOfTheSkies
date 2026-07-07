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
import { logEvent, allPlayersPassed, calculateMercy, nextUnpassedPlayer } from "./helpers/stateUtils";
import { wrapMove, withPhaseGuard, withPhaseReset, checkLoopGuard } from "./helpers/moveWrapper";
import { MOVE_DEFINITIONS } from "./moveDefinitions";
import {
  checkIfCurrentPlayerIsInCurrentBattle,
  fullResetFortuneOfWarCardDeck,
  resetBattleCheckCount,
} from "./helpers/helpers";
import { TurnOrder } from "boardgame.io/core";
import resolveRound from "./helpers/resolveRound";
import { ALL_EVENT_CARD_NAMES } from "./helpers/eventCardDefinitions";
import { beginResolution, getResolutionTarget } from "./helpers/resolutionFlow";

import { setStage, isStage } from "./helpers/stageUtils";
import type { GameStage } from "./types";
import log from "./helpers/logger";

const phaseLog = log.child({ mod: "phase" });
const budgetLog = log.child({ mod: "turn-budget" });

/**
 * Registers a set of moves from MOVE_DEFINITIONS — the single source of truth
 * for move implementations AND their validators (some definitions carry
 * stricter validate() wrappers than the raw move files; the server enforces
 * those too). Throws at load time on a typo'd name.
 */
const wrapSet = (...names: string[]) =>
  Object.fromEntries(
    names.map((name) => {
      const def = MOVE_DEFINITIONS[name];
      if (!def) throw new Error(`wrapSet: unknown move "${name}" — not in MOVE_DEFINITIONS`);
      return [name, wrapMove(name, def)];
    })
  );

const TURN_ENDING_LIMIT = 550;
const turnEndingCounters = new Map<string, number>();
const turnEndingRounds = new Map<string, number>();

function budgetFor(G: MyGameState) {
  const mid = G._matchID ?? "unknown";
  return { counter: turnEndingCounters.get(mid) ?? 0, round: turnEndingRounds.get(mid) ?? 0, mid };
}

function incrBudget(G: MyGameState) {
  const mid = G._matchID ?? "unknown";
  const next = (turnEndingCounters.get(mid) ?? 0) + 1;
  turnEndingCounters.set(mid, next);
  return next;
}

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
            const counter = incrBudget(G);
            const phase = context.ctx?.phase ?? "?";
            const stage = G?.stage ? `${G.stage.phase}/${G.stage.sub}` : "?";
            const { round } = budgetFor(G);

            if (counter >= TURN_ENDING_LIMIT) {
              budgetLog.error({
                count: counter,
                type: "endTurn",
                method: methodType,
                phase,
                stage,
                round,
                turn: context.ctx?.turn,
                next: endTurnArgs?.next,
              }, "BUDGET EXCEEDED — halting game");
              return;
            }

            if (counter % 50 === 0) {
              budgetLog.warn({
                count: counter,
                method: methodType,
                phase,
                stage,
                round,
                turn: context.ctx?.turn,
                next: endTurnArgs?.next,
              }, "endTurn milestone");
            }

            return origEndTurn(endTurnArgs);
          };
        }

        if (origEndPhase) {
          events.endPhase = (...phaseArgs: any[]) => {
            const counter = incrBudget(G);
            const phase = context.ctx?.phase ?? "?";
            const stage = G?.stage ? `${G.stage.phase}/${G.stage.sub}` : "?";
            const { round } = budgetFor(G);

            if (counter >= TURN_ENDING_LIMIT) {
              budgetLog.error({
                count: counter,
                type: "endPhase",
                method: methodType,
                phase,
                stage,
                round,
                turn: context.ctx?.turn,
              }, "BUDGET EXCEEDED — halting game");
              return;
            }

            if (counter % 50 === 0) {
              budgetLog.warn({
                count: counter,
                method: methodType,
                phase,
                stage,
                round,
                turn: context.ctx?.turn,
              }, "endPhase milestone");
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
export function resetTurnEndingBudget(G: MyGameState, round: number): void {
  const mid = G._matchID ?? "unknown";
  const counter = turnEndingCounters.get(mid) ?? 0;
  if (counter > 0) {
    budgetLog.info({
      count: counter,
      round: turnEndingRounds.get(mid) ?? 0,
    }, "round budget summary");
  }
  turnEndingCounters.set(mid, 0);
  turnEndingRounds.set(mid, round);
}

/** Read-only access for tests / diagnostics. */
export function getTurnEndingCount(G: MyGameState): number {
  return turnEndingCounters.get(G._matchID ?? "unknown") ?? 0;
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
      _matchID: `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
  moves: wrapSet("discoverTile", "alterPlayerOrder", "recruitCounsellors", "recruitRegiments", "purchaseSkyships", "foundBuildings", "increaseHeresy", "increaseOrthodoxy", "checkAndPlaceFort", "punishDissenters", "convertMonarch", "influencePrelates", "trainTroops", "drawFoWCards", "confirmAction", "flipCards", "buildSkyships", "conscriptLevies", "passFleetInfoToPlayerInfo", "deployFleet", "enableDispatchButtons", "issueHolyDecree", "garrisonTransfer", "pass", "attackOtherPlayersFleet", "evadeAttackingFleet", "doNotAttack", "retaliate", "drawCard", "pickCard", "relocateDefeatedFleet", "plunder", "doNotPlunder", "attackPlayersBuilding", "doNotGroundAttack", "defendGroundAttack", "garrisonTroops", "yieldToAttacker", "chooseEventCard", "resolveEventChoice", "commitRebellionTroops", "nominateCaptainGeneral", "contributeToGrandArmy", "respondToInfidelFleet", "contributeToRebellion", "offerBuyoffGold"),
  phases: {
    setup: {
      start: true,
      moves: wrapSet("pickKingdomAdvantageCard", "pickLegacyCard"),
      next: "events",
      onBegin: (context) => {
        phaseLog.info({ round: context.G.round }, "setup");
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
        phaseLog.info({ round: context.G.round }, "events");
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
      moves: wrapSet("chooseEventCard", "resolveEventChoice", "immediateElectionVote"),
      next: "discovery",
    },
    discovery: {
      onBegin: (context) => {
        // Reset the loop guard at the start of each new round, then check.
        context.G._loopGuard = 0;
        context.G._halted = false;
        resetBattleCheckCount();
        resetTurnEndingBudget(context.G, context.G.round + 1);
        if (checkLoopGuard(context, "discovery")) return;
        phaseLog.info({ round: context.G.round + 1 }, "discovery");
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
      moves: wrapSet("discoverTile", "pass"),
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
        phaseLog.info({ round: context.G.round }, "taxes");
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
        phaseLog.info({ round: context.G.round }, "actions");
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

          if (currentPlayer.actionsTakenThisRound >= currentPlayer.resources.counsellors && !currentPlayer.passed) {
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
      moves: wrapSet("alterPlayerOrder", "recruitCounsellors", "recruitRegiments", "purchaseSkyships", "foundBuildings", "foundFactory", "increaseHeresy", "increaseOrthodoxy", "checkAndPlaceFort", "punishDissenters", "convertMonarch", "influencePrelates", "trainTroops", "drawFoWCards", "confirmAction", "discardFoWCard", "flipCards", "buildSkyships", "conscriptLevies", "passFleetInfoToPlayerInfo", "deployFleet", "moveFleet", "transferBetweenFleets", "sellSkyships", "sellBuilding", "transferOutpost", "proposeDeal", "acceptDeal", "rejectDeal", "enableDispatchButtons", "issueHolyDecree", "garrisonTransfer", "sendAgitators", "declareSmugglerGood", "pass"),
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
        phaseLog.info({ round: context.G.round }, "resolution");
        // Walk the full resolution sequence: aerial → plunder → ground → conquest → election → post-election → retrieve
        beginResolution(context.G, context.events, true);
      },
      onEnd: (context) => {
        resolveRound(context.G, context.events, context.random);
      },
      moves: wrapSet("doNotAttack", "attackOtherPlayersFleet", "retaliate", "evadeAttackingFleet", "drawCard", "pickCard", "relocateDefeatedFleet", "plunder", "doNotPlunder", "attackPlayersBuilding", "doNotGroundAttack", "defendGroundAttack", "yieldToAttacker", "coloniseLand", "constructOutpost", "doNothing", "drawCardConquest", "pickCardConquest", "garrisonTroops", "vote", "pass", "retrieveFleets", "commitRebellionTroops", "contributeToRebellion", "nominateCaptainGeneral", "contributeToGrandArmy", "respondToInfidelFleet", "offerBuyoffGold", "commitDeferredBattleCard"),
      next: "reset",
    },
    reset: {
      turn: { order: TurnOrder.ONCE },
      onBegin: (context) => {
        if (checkLoopGuard(context, "reset")) return;
        phaseLog.info({ round: context.G.round }, "reset");
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

        // Reset action board
        context.G.boardState = createInitialBoardState();

        // Reset player state for new round
        Object.values(context.G.playerInfo).forEach((player) => {
          // Reset action counter (counsellors stay as-is — they only change via recruit/spend)
          player.actionsTakenThisRound = 0;

          const pb = player.playerBoardCounsellorLocations;
          // Reset all player board flags
          pb.buildSkyships = false;
          pb.conscriptLevies = false;
          pb.dispatchSkyshipFleet = false;
          pb.trainTroops = false;
          pb.dispatchDisabled = false;
          // Reset per-fleet dispatched state
          player.fleetInfo.forEach((f) => {
            f.dispatchedThisRound = false;
          });
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
