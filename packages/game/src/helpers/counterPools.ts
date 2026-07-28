import type {
  InfidelHostCounter,
  MyGameState,
  OccupyingCounter,
} from "../types.js";

type Shuffle = <T>(items: T[]) => T[];

export const returnContingentCounter = (
  G: MyGameState,
  counter: number,
  shuffle: Shuffle
): void => {
  G.contingentPool = shuffle([...G.contingentPool, counter]);
};

export const returnInfidelHostCounter = (
  G: MyGameState,
  counter: InfidelHostCounter,
  shuffle: Shuffle
): void => {
  // There is only one Fleet counter. The guard also protects old persisted
  // states in which it may already have been returned.
  if (counter.isFleet && G.infidelHostPool.some((host) => host.isFleet)) {
    return;
  }
  G.infidelHostPool = shuffle([...G.infidelHostPool, counter]);
};

export const returnOccupyingCounter = (
  G: MyGameState,
  counter: OccupyingCounter,
  shuffle: Shuffle
): void => {
  if (counter.kind === "rebels") {
    returnContingentCounter(G, counter.swords, shuffle);
  } else {
    returnInfidelHostCounter(G, counter.counter, shuffle);
  }
};
