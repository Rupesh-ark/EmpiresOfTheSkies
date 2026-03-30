import { GameMood } from "@/theme";

export type PanelSlot =
  | "map"
  | "action-board"
  | "player-board"
  | "game-log"
  | "stats"
  | "rules"
  | "empty";

export type MapSize = "compact" | "medium" | "large";

export interface PhaseLayoutConfig {
  mapSize: MapSize;
  left: PanelSlot[];
  right: PanelSlot[];
  bottom: PanelSlot;
  tabExtras: PanelSlot[];
  bottomHeight: string;
}

export const PHASE_LAYOUTS: Record<GameMood, PhaseLayoutConfig> = {
  peacetime: {
    mapSize: "compact",
    left: ["player-board"],
    right: [],
    bottom: "action-board",
    tabExtras: ["game-log", "stats", "rules"],
    bottomHeight: "45vh",
  },

  battle: {
    mapSize: "large",
    left: ["player-board"],
    right: [],
    bottom: "empty",
    tabExtras: ["action-board", "game-log", "stats", "rules"],
    bottomHeight: "0px",
  },

  election: {
    mapSize: "compact",
    left: ["player-board"],
    right: ["stats"],
    bottom: "empty",
    tabExtras: ["action-board", "game-log", "rules"],
    bottomHeight: "0px",
  },

  discovery: {
    mapSize: "large",
    left: ["player-board"],
    right: [],
    bottom: "empty",
    tabExtras: ["action-board", "game-log", "stats", "rules"],
    bottomHeight: "0px",
  },

  crisis: {
    mapSize: "medium",
    left: ["player-board"],
    right: [],
    bottom: "empty",
    tabExtras: ["action-board", "game-log", "stats", "rules"],
    bottomHeight: "0px",
  },
};

export const getPhaseLayout = (mood: GameMood): PhaseLayoutConfig =>
  PHASE_LAYOUTS[mood];
