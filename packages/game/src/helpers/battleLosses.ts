export type BattleLossMode = "aerial" | "ground" | "conquest";

export type BattleForce = {
  levies: number;
  skyships: number;
  regiments: number;
  eliteRegiments: number;
};

export type BattleLosses = BattleForce & {
  ignoredHits: number;
};

const emptyLosses = (): BattleLosses => ({
  levies: 0,
  skyships: 0,
  regiments: 0,
  eliteRegiments: 0,
  ignoredHits: 0,
});

/**
 * Apportion battle hits without destroying a two-hit troop on a partial hit.
 *
 * The automatic priority remains owner-favouring (levies → skyships →
 * regiments → elites). Player-chosen apportionment is a separate open audit
 * finding.
 *
 * eots42:669 — aerial odd hits must destroy a Levy (preferred here) or Skyship.
 * eots42:678 — Regiments and Elite Regiments each absorb two hits.
 * eots42:689,695 — ground/conquest odd hits are ignored unless Levies are present.
 */
export const apportionBattleLosses = (
  force: BattleForce,
  hits: number,
  mode: BattleLossMode
): BattleLosses => {
  const available: BattleForce = {
    levies: Math.max(0, force.levies),
    skyships: Math.max(0, force.skyships),
    regiments: Math.max(0, force.regiments),
    eliteRegiments: Math.max(0, force.eliteRegiments),
  };
  const losses = emptyLosses();
  let remaining = Math.max(0, Math.floor(hits));

  const lose = (
    unit: keyof BattleForce,
    count: number,
    hitCost: number
  ): void => {
    const amount = Math.min(
      available[unit],
      count,
      Math.floor(remaining / hitCost)
    );
    available[unit] -= amount;
    losses[unit] += amount;
    remaining -= amount * hitCost;
  };

  if (remaining % 2 === 1) {
    if (available.levies > 0) {
      lose("levies", 1, 1);
    } else if (mode === "aerial" && available.skyships > 0) {
      lose("skyships", 1, 1);
    } else if (mode !== "aerial") {
      remaining -= 1;
      losses.ignoredHits += 1;
    }
  }

  lose("levies", available.levies, 1);
  lose("skyships", available.skyships, 1);
  lose("regiments", available.regiments, 2);
  lose("eliteRegiments", available.eliteRegiments, 2);

  losses.ignoredHits += remaining;
  return losses;
};
