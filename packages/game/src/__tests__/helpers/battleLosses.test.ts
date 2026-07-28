import { describe, expect, it } from "vitest";
import {
  apportionBattleLosses,
  type BattleForce,
  type BattleLossMode,
} from "../../helpers/battleLosses.js";

const force = (overrides: Partial<BattleForce>): BattleForce => ({
  levies: 0,
  skyships: 0,
  regiments: 0,
  eliteRegiments: 0,
  ...overrides,
});

describe("rulebook battle-loss apportionment", () => {
  it.each<{
    name: string;
    mode: BattleLossMode;
    hits: number;
    units: BattleForce;
    expected: Partial<ReturnType<typeof apportionBattleLosses>>;
  }>([
    {
      name: "odd aerial hits lose a Levy before a full Regiment pair",
      mode: "aerial",
      hits: 3,
      units: force({ levies: 1, regiments: 2, skyships: 2 }),
      expected: { levies: 1, regiments: 0, skyships: 2, ignoredHits: 0 },
    },
    {
      name: "odd aerial hits with only Skyships lose a Skyship",
      mode: "aerial",
      hits: 3,
      units: force({ skyships: 4 }),
      expected: { skyships: 3, ignoredHits: 0 },
    },
    {
      name: "odd aerial hits with only Regiments ignore the partial hit",
      mode: "aerial",
      hits: 3,
      units: force({ regiments: 2 }),
      expected: { regiments: 1, ignoredHits: 1 },
    },
    {
      name: "odd ground hits destroy a Levy when present",
      mode: "ground",
      hits: 3,
      units: force({ levies: 1, regiments: 2 }),
      expected: { levies: 1, regiments: 1, ignoredHits: 0 },
    },
    {
      name: "odd ground hits are ignored without a Levy",
      mode: "ground",
      hits: 3,
      units: force({ regiments: 2 }),
      expected: { regiments: 1, ignoredHits: 1 },
    },
    {
      name: "an Elite Regiment absorbs exactly two hits",
      mode: "ground",
      hits: 2,
      units: force({ eliteRegiments: 1 }),
      expected: { eliteRegiments: 1, ignoredHits: 0 },
    },
    {
      name: "conquest does not ceil a partial hit into a Regiment loss",
      mode: "conquest",
      hits: 1,
      units: force({ regiments: 1 }),
      expected: { regiments: 0, ignoredHits: 1 },
    },
  ])("$name", ({ mode, hits, units, expected }) => {
    // eots42:669,678,689,695 — aerial parity, two-hit elites, ground parity,
    // and conquest's use of ground-battle loss rules.
    expect(apportionBattleLosses(units, hits, mode)).toMatchObject(expected);
  });
});
