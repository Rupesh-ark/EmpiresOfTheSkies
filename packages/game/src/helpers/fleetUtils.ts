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

/**
 * What a fleet actually contributes in battle. Shared with the UI so a
 * displayed strength can never drift from the one resolveBattle applies:
 * Regiment 2 Swords, Elite 3, Levy 1, Skyship 1 Sword + 1 Shield.
 */
export function fleetCombatValues(fleet: FleetTroopCounts | FleetInfo): {
  swords: number;
  shields: number;
} {
  return {
    swords:
      fleet.skyships + fleet.levies + fleet.regiments * 2 + fleet.eliteRegiments * 3,
    shields: fleet.skyships,
  };
}
