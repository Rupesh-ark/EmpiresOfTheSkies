import type { Game, Ctx } from "boardgame.io";

import { LegacyCard, MyGameState, MapState } from "./types";

import { FINAL_ROUND, LEGACY_CARDS } from "./codifiedGameInfo";
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
import {
  checkAndPlaceFort,
  flipCards,
  increaseHeresy,
  increaseOrthodoxy,
} from "./moves/resourceUpdates";
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
import enableDispatchButtons from "./moves/actions/enableDispatchButtons";
import issueHolyDecree from "./moves/actions/issueHolyDecree";
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

import { findNextBattle, findNextPlunder } from "./helpers/findNext";
import { TurnOrder } from "boardgame.io/core";
import resolveRound from "./helpers/resolveRound";
import pickLegacyCard from "./moves/pickLegacyCard";

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

    return {
      playerInfo: buildPlayerInfoMap(ctx),
      mapState: mapState,
      boardState: { ...initialBoardState },
      playerOrder: {
        1: undefined,
        2: undefined,
        3: undefined,
        4: undefined,
        5: undefined,
        6: undefined,
      },
      cardDecks: {
        fortuneOfWarCards: fullResetFortuneOfWarCardDeck(),
        discardedFortuneOfWarCards: [],
      },
      stage: "discovery",
      electionResults: {},
      hasVoted: [],
      round: 0,
      finalRound: FINAL_ROUND,
      firstTurnOfRound: true,
      turnOrder: ctx.playOrder,
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
  },
  phases: {
    legacy_card: {
      start: true,
      moves: { pickLegacyCard },
      next: "discovery",
      onBegin: (context) => {
        context.G.stage = "pick legacy card";
        const cards: LegacyCard[] = [...LEGACY_CARDS];
        Object.values(context.G.playerInfo).forEach((player) => {
          for (let i = 0; i < 3; i++) {
            let randomIndex = Math.floor(Math.random() * cards.length);
            const card = cards.splice(randomIndex, 1);
            player.legacyCardOptions.push(card[0]);
          }
        });
      },
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
        const currentTurnOrder = [...context.ctx.playOrder];
        let newTurnOrder: string[] = [];
        Object.values(context.G.boardState.alterPlayerOrder).forEach(
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

        context.G.boardState = { ...initialBoardState };

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
      next: "actions",
      onEnd: (context) => {
        Object.values(context.G.playerInfo).forEach((playerInfo: any) => {
          playerInfo.passed = false;
        });
      },
    },
    actions: {
      onBegin: (context) => {
        context.G.firstTurnOfRound = true;
        context.G.stage = "actions";
        console.log("Actions phase has begun");
        context.ctx.playOrder.forEach((id, index) => {
          context.G.playerInfo[id].resources.gold += getGoldIncomeForPlayer(index);
        });
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
        setTurnCompleteFalse,
      },
      onEnd: (context) => {
        Object.values(context.G.playerInfo).forEach((playerInfo: any) => {
          playerInfo.passed = false;
        });
      },
      next: "battle",
    },
    battle: {
      onBegin: (context) => {
        console.log("Battle phase has begun");
        findNextBattle(context.G, context.events);
      },
      turn: {
        onBegin: (context) => {
          console.log(
            `It is now player ${context.ctx.currentPlayer}'s turn in the battle phase`
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
        doNotAttack,
        attackOtherPlayersFleet,
        retaliate,
        evadeAttackingFleet,
        drawCard,
        pickCard,
        relocateDefeatedFleet,
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
      turn: { order: TurnOrder.ONCE },
      onBegin: (context) => {
        console.log("resolution phase has begun");
        context.G.stage = "retrieve fleets";
      },
      onEnd: (context) => {
        resolveRound(context.G, context.events);
        console.log(`Round number:${context.G.round}`);
      },
      moves: { retrieveFleets },
      next: "discovery",
    },
  },
  maxPlayers: 6,
  minPlayers: 1,
};

export { MyGame };
