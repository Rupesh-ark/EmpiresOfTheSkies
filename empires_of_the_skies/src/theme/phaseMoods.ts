import { tokens } from "./tokens";
import type { GameStage } from "@eots/game";

export type GameMood = "peacetime" | "battle" | "election" | "discovery" | "crisis";

const PHASE_TO_MOOD: Record<string, GameMood> = {
  setup:      "peacetime",
  discovery:  "peacetime",
  taxes:      "peacetime",
  actions:    "peacetime",
  resolution: "battle",
  scoring:    "peacetime",
  reset:      "peacetime",
  events:     "crisis",
};

/** Sub-stages that override their phase's default mood */
const SUB_MOOD_OVERRIDES: Record<string, GameMood> = {
  election:               "election",
  immediate_election:     "election",
  rebellion:              "crisis",
  rebellion_rival_support: "crisis",
  invasion_nominate:      "crisis",
  invasion_contribute:    "crisis",
  invasion_buyoff:        "crisis",
  retrieve_fleets:        "peacetime",
};

export const getMood = (stage: GameStage): GameMood =>
  SUB_MOOD_OVERRIDES[stage.sub] ?? PHASE_TO_MOOD[stage.phase] ?? "peacetime";

export const getMoodTokens = (mood: GameMood) => tokens.mood[mood];
