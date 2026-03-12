import { ActionBoardInfo } from "../types";

export const initialBoardState: ActionBoardInfo = {
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
  purchaseSkyshipsZeeland: {
    1: undefined,
    2: undefined,
  },
  purchaseSkyshipsVenoa: {
    1: undefined,
    2: undefined,
  },
  foundBuildings: {
    1: [],
    2: [],
    3: [],
    4: [],
  },
  foundFactories: {
    1: undefined,
    2: undefined,
    3: undefined,
    4: undefined,
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

export const initialBattleMapState = (): string[][][] => {
  const eightEmptySets: string[][] = [[], [], [], [], [], [], [], []];
  return [
    [...eightEmptySets],
    [...eightEmptySets],
    [...eightEmptySets],
    [...eightEmptySets],
  ];
};
