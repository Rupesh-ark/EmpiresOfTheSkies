import { tokens } from "./tokens";

export type GameMood = "peacetime" | "battle" | "election" | "discovery" | "crisis";

const STAGE_TO_MOOD: Record<string, GameMood> = {
  // Peaceful
  actions:          "peacetime",
  "resolve round":  "peacetime",
  reset:            "peacetime",
  "retrieve fleets": "peacetime",
  "pick legacy card": "peacetime",
  "pick kingdom advantage": "peacetime",

  // Discovery
  discovery: "peacetime",

  // Battle
  "attack or pass":        "battle",
  "attack or evade":       "battle",
  "draw or pick card":     "battle",
  "resolve battle":        "battle",
  aerial_battle:           "battle",
  ground_battle:           "battle",
  "attack or pass ground": "battle",
  "defend ground attack":  "battle",
  conquest:                "battle",
  "garrison troops":       "battle",
  plunder_legends:         "battle",
  "relocate loser":        "battle",
  infidel_fleet_combat:    "battle",
  deferred_battle:         "battle",

  // Election
  election: "election",

  // Crisis / events
  events:                  "crisis",
  rebellion:               "crisis",
  rebellion_rival_support: "crisis",
  invasion:                "crisis",
  invasion_buyoff:         "crisis",
  invasion_nominate:       "crisis",
  invasion_contribute:     "crisis",
};

export const getMood = (stage: string): GameMood =>
  STAGE_TO_MOOD[stage] ?? "peacetime";

export const getMoodTokens = (mood: GameMood) => tokens.mood[mood];
