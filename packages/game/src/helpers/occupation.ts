import type {
  MapBuildingInfo,
  OccupyingCounter,
} from "../types.js";

/** Read both current typed counters and legacy sword-only saved state. */
export const getOccupyingCounter = (
  building: MapBuildingInfo | undefined
): OccupyingCounter | null => {
  const counter = building?.rebelCounter;
  if (counter === undefined) return null;
  if (typeof counter === "number") {
    return { kind: "rebels", swords: counter };
  }
  return counter;
};

export const isRebelOccupied = (
  building: MapBuildingInfo | undefined
): boolean => getOccupyingCounter(building) !== null;

export const getOccupyingCounterCombat = (
  counter: OccupyingCounter
): { swords: number; shields: number } =>
  counter.kind === "rebels"
    ? { swords: counter.swords, shields: 0 }
    : {
        swords: counter.counter.swords,
        shields: counter.counter.shields,
      };
