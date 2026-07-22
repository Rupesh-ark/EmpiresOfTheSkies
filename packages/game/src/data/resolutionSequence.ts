// Rulebook “Resolution Sequence” (rulesets/eots42.md); the “Resolution” umbrella is presentation-only.
export const RESOLUTION_SEQUENCE = [
  "rebellions",
  "aerialBattles",
  "plunder",
  "groundBattles",
  "conquests",
  "trade",
  "sellGoods",
  "piracy",
  "factoryIncome",
  "election",
  "invasionCheck",
  "retrieveFleets",
] as const;

export type PhaseGroup =
  | "setup"
  | "events"
  | "discovery"
  | "taxes"
  | "actions"
  | "resolution"
  | "scoring"
  | "reset";

export const phaseGroup = (phase: string): PhaseGroup =>
  (RESOLUTION_SEQUENCE as readonly string[]).includes(phase)
    ? "resolution"
    : phase as PhaseGroup;
