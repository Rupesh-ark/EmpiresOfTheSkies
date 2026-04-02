export interface CombatantStats {
  swords: number;
  shields: number;
  fowSword: number;
  fowShield: number;
}

export interface CombatResult {
  hitsOnAttacker: number;
  hitsOnDefender: number;
}

/**
 * Calculate combat hits for both sides.
 * Pure math -- no side effects, no state mutation.
 *
 * Callers are responsible for:
 * - Assembling CombatantStats from their context (fleets, garrisons, rebel counters, etc.)
 * - Applying kingdom advantage bonuses (improved_training) BEFORE calling this
 * - Determining winner based on hits vs HP
 * - Applying losses after
 */
export const calculateCombat = (
  attacker: CombatantStats,
  defender: CombatantStats
): CombatResult => ({
  hitsOnDefender: Math.max(0, attacker.swords + attacker.fowSword - defender.shields - defender.fowShield),
  hitsOnAttacker: Math.max(0, defender.swords + defender.fowSword - attacker.shields - attacker.fowShield),
});
