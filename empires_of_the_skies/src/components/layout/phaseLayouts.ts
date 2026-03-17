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
  gridColumns: {
    laptop: string;
    desktop: string;
    wide: string;
  };
  bottomHeight: string;
}

export const PHASE_LAYOUTS: Record<GameMood, PhaseLayoutConfig> = {
  peacetime: {
    mapSize: "compact",
    left: ["player-board"],
    right: [],
    bottom: "action-board",
    tabExtras: ["game-log", "stats", "rules"],
    gridColumns: {
      laptop:  "280px 1fr 0px",
      desktop: "300px 1fr 0px",
      wide:    "340px 1fr 0px",
    },
    bottomHeight: "45vh",
  },

  battle: {
    mapSize: "large",
    left: ["player-board"],
    right: [],
    bottom: "empty",
    tabExtras: ["action-board", "game-log", "stats", "rules"],
    gridColumns: {
      laptop:  "240px 1fr 0px",
      desktop: "280px 1fr 0px",
      wide:    "320px 1fr 0px",
    },
    bottomHeight: "0px",
  },

  election: {
    mapSize: "compact",
    left: ["player-board"],
    right: ["stats"],
    bottom: "empty",
    tabExtras: ["action-board", "game-log", "rules"],
    gridColumns: {
      laptop:  "240px 1fr 280px",
      desktop: "280px 1fr 320px",
      wide:    "320px 1fr 380px",
    },
    bottomHeight: "0px",
  },

  discovery: {
    mapSize: "large",
    left: ["player-board"],
    right: [],
    bottom: "empty",
    tabExtras: ["action-board", "game-log", "stats", "rules"],
    gridColumns: {
      laptop:  "240px 1fr 0px",
      desktop: "260px 1fr 0px",
      wide:    "300px 1fr 0px",
    },
    bottomHeight: "0px",
  },

  crisis: {
    mapSize: "medium",
    left: ["player-board"],
    right: [],
    bottom: "empty",
    tabExtras: ["action-board", "game-log", "stats", "rules"],
    gridColumns: {
      laptop:  "240px 1fr 0px",
      desktop: "280px 1fr 0px",
      wide:    "320px 1fr 0px",
    },
    bottomHeight: "0px",
  },
};

export const getPhaseLayout = (mood: GameMood): PhaseLayoutConfig =>
  PHASE_LAYOUTS[mood];
