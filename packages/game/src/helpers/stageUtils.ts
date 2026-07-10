import { MyGameState, GameStage, StagePhase } from "../types";
import log from "./logger";

const validStages = new Set<string>([
  "setup:kingdom_advantage", "setup:legacy_card",
  "events:default", "events:immediate_election",
  "discovery:default",
  "taxes:default",
  "actions:default", "actions:confirm_fow_draw", "actions:discard_fow",
  "resolution:rebellion", "resolution:rebellion_rival_support",
  "resolution:aerial_attack_or_pass", "resolution:aerial_attack_or_evade", "resolution:aerial_resolve",
  "resolution:plunder_legends",
  "resolution:ground_attack_or_pass", "resolution:ground_defend_or_yield", "resolution:ground_resolve", "resolution:ground_garrison",
  "resolution:relocate_loser",
  "resolution:conquest", "resolution:conquest_draw_or_pick", "resolution:conquest_garrison",
  "resolution:election",
  "resolution:infidel_fleet_combat", "resolution:deferred_battle",
  "resolution:invasion_nominate", "resolution:invasion_contribute", "resolution:invasion_buyoff",
  "resolution:retrieve_fleets",
  "scoring:default",
  "reset:default", "reset:round_summary",
]);

export const setStage = <P extends StagePhase>(
  G: MyGameState,
  phase: P,
  sub: Extract<GameStage, { phase: P }>["sub"]
): void => {
  const key = `${phase}:${sub}`;
  if (!validStages.has(key)) {
    log.warn({ phase, sub }, "setStage called with invalid phase/sub combination");
    return;
  }
  G.stage = { phase, sub } as GameStage;
};

/** Type-safe stage checker — phase only or phase+sub */
export const isStage = <P extends StagePhase>(
  G: MyGameState,
  phase: P,
  sub?: Extract<GameStage, { phase: P }>["sub"]
): boolean => {
  if (G.stage.phase !== phase) return false;
  if (sub !== undefined) return G.stage.sub === sub;
  return true;
};
