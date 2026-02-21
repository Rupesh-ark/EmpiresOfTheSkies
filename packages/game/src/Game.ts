import type { Game, Ctx } from "boardgame.io";

import { ActionBoardInfo, LegacyCard, MyGameState } from "./types";

import {
  TileInfoProps,
  PlayerInfo,
  MapState,
  MapBuildingInfo,
  PlayerColour,
} from "./types";
import {
  unknownWorldTiles,
  oceanTiles,
  legendTiles,
  knownWorldTiles,
  colourToKingdomMap,
} from "./codifiedGameInfo";
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

const initialBoardState: ActionBoardInfo = {
  alterPlayerOrder: {
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
  },
  recruitCounsellors: {
    1: undefined,
    2: undefined,
    3: undefined,
  },
  recruitRegiments: {
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
  },
  trainTroops: {
    1: undefined,
    2: undefined,
  },
  purchaseSkyships: {
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
  },
  foundBuildings: {
    1: [],
    2: [],
    3: [],
    4: [],
  },
  influencePrelates: {
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
    7: undefined,
    8: undefined,
  },
  punishDissenters: {
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
  },
  convertMonarch: {
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
  },
  issueHolyDecree: false,
};

const MyGame: Game<MyGameState> = {
  turn: { minMoves: 1 },
  name: "empires-of-the-skies",
  setup: ({ ctx }: { ctx: Ctx }): MyGameState => {
    const mapState: MapState = {
      currentTileArray: getRandomisedMapTileArray(),
      discoveredTiles: getInitialDiscoveredTiles(),
      buildings: getInitialOutpostsAndColonysInfo(),
      mostRecentlyDiscoveredTile: [4, 0],
      discoveredRaces: [],
      battleMap: initialBattleMapState(),
      currentBattle: [0, 0],
    };
    const playerInfos = (ctx: Ctx): { [details: string]: PlayerInfo } => {
      const colours = getPlayerColours(ctx);
      const playerIDMap: { [details: string]: PlayerInfo } = {};
      ctx.playOrder.forEach((playerID: string) => {
        const playerColour = colours.pop();
        playerIDMap[playerID] = {
          id: playerID,
          kingdomName: colourToKingdomMap[playerColour ?? PlayerColour.green],
          colour: playerColour ?? PlayerColour.green,
          legacyCardOptions: [],
          ready: true, //look into what this should be
          passed: false,
          turnComplete: false,
          resources: {
            gold: 6,
            mithril: 0,
            dragonScales: 0,
            krakenSkin: 0,
            magicDust: 0,
            stickyIchor: 0,
            pipeweed: 0,
            victoryPoints: 10,
            counsellors: 6,
            skyships: 3,
            regiments: 6,
            levies: 0,
            fortuneCards: [],
            advantageCard: "",
            eventCards: [""],
            legacyCard: undefined,
          },
          isArchprelate: playerID === ctx.playOrder[ctx.playOrder.length - 1],
          playerBoardCounsellorLocations: {
            buildSkyships: false,
            conscriptLevies: false,
            dispatchSkyshipFleet: false,
            dispatchDisabled: true,
          },
          hereticOrOrthodox: "orthodox",
          fleetInfo: [
            {
              fleetId: 0,
              location: [4, 0],
              skyships: 0,
              regiments: 0,
              levies: 0,
            },
            {
              fleetId: 1,
              location: [4, 0],
              skyships: 0,
              regiments: 0,
              levies: 0,
            },
            {
              fleetId: 2,
              location: [4, 0],
              skyships: 0,
              regiments: 0,
              levies: 0,
            },
          ],
          cathedrals: 1,
          palaces: 1,
          heresyTracker: 0,
          prisoners: 0,
          shipyards: 0,
        };
      });
      return playerIDMap;
    };

    return {
      playerInfo: playerInfos(ctx),
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
      finalRound: 4,
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
        const cards: LegacyCard[] = [
          "the builder",
          "the conqueror",
          "the explorer",
          "the great",
          "the magnificent",
          "the merchant",
          "the mighty",
          "the navigator",
          "the pious",
          "the builder",
          "the conqueror",
          "the explorer",
          "the great",
          "the magnificent",
          "the merchant",
          "the mighty",
          "the navigator",
          "the pious",
        ];
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
          context.G.playerInfo[id].resources.gold += 4 + index;
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
      next: "aerial_battle",
    },
    aerial_battle: {
      onBegin: (context) => {
        findNextBattle(context.G, context.events);
        console.log("Aerial battle phase has begun");
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
      next: "plunder_legends",
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
    plunder_legends: {
      onBegin: (context) => {
        context.G.stage = "plunder legends";
        console.log("Plunder legends phase has begun");

        findNextPlunder(context.G, context.events);
      },
      moves: { plunder, doNotPlunder },
      next: "ground_battle",
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
    ground_battle: {
      onBegin: (context) => {
        context.G.stage = "attack or pass";

        console.log("Ground battles have begun");
      },
      turn: {
        onBegin: (context) => {
          console.log(
            `it is now player ${context.ctx.currentPlayer}'s time to ground attack`
          );
          checkIfCurrentPlayerIsInCurrentBattle(
            context.G,
            context.ctx,
            context.events
          );
        },
      },
      moves: {
        attackPlayersBuilding,
        doNotGroundAttack,
        defendGroundAttack,
        garrisonTroops,
        yieldToAttacker,
      },
      next: "conquest",
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

const getRandomisedMapTileArray = () => {
  let randomTiles = oceanTiles.concat(unknownWorldTiles, legendTiles);

  let currentIndex = 28;
  let randomIndex = 0;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [randomTiles[currentIndex], randomTiles[randomIndex]] = [
      randomTiles[randomIndex],
      randomTiles[currentIndex],
    ];
  }
  randomTiles.splice(3, 0, knownWorldTiles[0]);
  randomTiles.splice(4, 0, knownWorldTiles[1]);
  randomTiles.splice(11, 0, knownWorldTiles[2]);
  randomTiles.splice(12, 0, knownWorldTiles[3]);
  const twoDimensionalMapArray: TileInfoProps[][] = [
    randomTiles.slice(0, 8),
    randomTiles.slice(8, 16),
    randomTiles.slice(16, 24),
    randomTiles.slice(24, 32),
  ];
  return twoDimensionalMapArray;
};

const getInitialDiscoveredTiles = () => {
  const eightFalses = [false, false, false, false, false, false, false, false];
  const twoDimensionalBooleanArray: boolean[][] = [
    [...eightFalses],
    [...eightFalses],
    [...eightFalses],
    [...eightFalses],
  ];
  twoDimensionalBooleanArray[0][3] = true;
  twoDimensionalBooleanArray[0][4] = true;
  twoDimensionalBooleanArray[1][3] = true;
  twoDimensionalBooleanArray[1][4] = true;

  return twoDimensionalBooleanArray;
};

const getInitialOutpostsAndColonysInfo = () => {
  const buildingInfo: MapBuildingInfo = {
    garrisonedLevies: 0,
    garrisonedRegiments: 0,
    fort: false,
  };
  const eightBuildingInfo: MapBuildingInfo[] = [
    buildingInfo,
    buildingInfo,
    buildingInfo,
    buildingInfo,
    buildingInfo,
    buildingInfo,
    buildingInfo,
    buildingInfo,
  ];
  return [
    [...eightBuildingInfo],
    [...eightBuildingInfo],
    [...eightBuildingInfo],
    [...eightBuildingInfo],
  ];
};

const initialBattleMapState = (): string[][][] => {
  const eightEmptySets: string[][] = [[], [], [], [], [], [], [], []];

  return [
    [...eightEmptySets],
    [...eightEmptySets],
    [...eightEmptySets],
    [...eightEmptySets],
  ];
};

const getPlayerColours = (ctx: Ctx) => {
  const colours = [
    PlayerColour.brown,
    PlayerColour.blue,
    PlayerColour.green,
    PlayerColour.red,
    PlayerColour.white,
    PlayerColour.yellow,
  ];
  return colours.slice(0, ctx.numPlayers);
};

export { MyGame };
