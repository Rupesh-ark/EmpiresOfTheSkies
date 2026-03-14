import type { Ctx } from "boardgame.io";
import { PlayerInfo, PlayerColour } from "../types";
import { colourToKingdomMap, STARTING_RESOURCES, BASE_GOLD_INCOME } from "../codifiedGameInfo";
import { initialBattleMapState } from "./boardSetup";

export const getPlayerColours = (ctx: Ctx): string[] => {
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

export const buildPlayerInfoMap = (ctx: Ctx): { [id: string]: PlayerInfo } => {
  const colours = getPlayerColours(ctx);
  const playerIDMap: { [id: string]: PlayerInfo } = {};

  ctx.playOrder.forEach((playerID: string) => {
    const playerColour = (colours.pop() ?? PlayerColour.green) as (typeof PlayerColour)[keyof typeof PlayerColour];
    playerIDMap[playerID] = {
      id: playerID,
      kingdomName: colourToKingdomMap[playerColour],
      colour: playerColour,
      legacyCardOptions: [],
      ready: true,
      passed: false,
      turnComplete: false,
      resources: {
        gold: STARTING_RESOURCES.gold,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: STARTING_RESOURCES.victoryPoints,
        counsellors: STARTING_RESOURCES.counsellors,
        skyships: STARTING_RESOURCES.skyships,
        regiments: STARTING_RESOURCES.regiments,
        levies: 0,
        eliteRegiments: 0,
        fortuneCards: [],
        advantageCard: undefined,
        eventCards: [],
        legacyCard: undefined,
        smugglerGoodChoice: undefined,
      },
      isArchprelate: playerID === ctx.playOrder[ctx.playOrder.length - 1],
      playerBoardCounsellorLocations: {
        buildSkyships: false,
        conscriptLevies: false,
        dispatchSkyshipFleet: false,
        trainTroops: false,
        dispatchDisabled: true,
      },
      hereticOrOrthodox: "orthodox",
      fleetInfo: [
        { fleetId: 0, location: [4, 0], skyships: 0, regiments: 0, levies: 0 },
        { fleetId: 1, location: [4, 0], skyships: 0, regiments: 0, levies: 0 },
        { fleetId: 2, location: [4, 0], skyships: 0, regiments: 0, levies: 0 },
      ],
      cathedrals: 1,
      palaces: 1,
      heresyTracker: 0,
      prisoners: 0,
      shipyards: 0,
      factories: STARTING_RESOURCES.factories,
    };
  });

  return playerIDMap;
};

export const getGoldIncomeForPlayer = (turnIndex: number): number =>
  BASE_GOLD_INCOME + turnIndex;
