import { ActionBoardInfo } from "../types.js";
import { BuildingSlot, CounsellorSlot } from "../data/gameData.js";

export const initialBoardState: ActionBoardInfo = {
  pendingPlayerOrder: {
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
    5: undefined,
    6: undefined,
  },
  recruitCounsellors: [],
  recruitRegiments: [],
  purchaseSkyshipsZeeland: [],
  purchaseSkyshipsVenoa: [],
  foundBuildings: {
    [BuildingSlot.Cathedral]: [],
    [BuildingSlot.Palace]:    [],
    [BuildingSlot.Shipyard]:  [],
    [BuildingSlot.Fort]:      [],
  },
  foundFactories: [],
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
  punishDissenters: [],
  convertMonarch: [],
  issueHolyDecree: false,
};

export const createInitialBoardState = (): ActionBoardInfo => JSON.parse(JSON.stringify(initialBoardState));

export const initialBattleMapState = (): string[][][] => {
  const eightEmptySets: string[][] = [[], [], [], [], [], [], [], []];
  return [
    [...eightEmptySets],
    [...eightEmptySets],
    [...eightEmptySets],
    [...eightEmptySets],
  ];
};
