import type { FleetInfo } from "../types.js";

export interface FleetTroopCounts {
  skyships: number;
  regiments: number;
  levies: number;
  eliteRegiments: number;
}

export function calculateFleetStrength(fleet: FleetTroopCounts | FleetInfo): number {
  return (
    fleet.skyships * 1.5 +
    fleet.regiments +
    fleet.levies * 0.5 +
    fleet.eliteRegiments * 1.5
  );
}
