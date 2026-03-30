/**
 * Phase-driven layout configuration.
 *
 * Layout is keyed by STAGE (fine-grained), not mood (coarse).
 * Mood drives visual styling (colors, borders); stage drives WHERE panels go.
 *
 * The player board is ALWAYS visible in the left sidebar —
 * narrow (compact) in most phases, wide (full) during actions.
 */

export type PanelSlot =
  | "map"
  | "action-board"
  | "player-board"
  | "game-log"
  | "stats"
  | "chat"
  | "trade"
  | "action-info"
  | "empty";

export type MapSize = "compact" | "medium" | "large";

export interface PhaseLayoutConfig {
  mapSize: MapSize;
  left: PanelSlot[];
  right: PanelSlot[];
  bottom: PanelSlot;
  tabExtras: PanelSlot[];
  bottomHeight: string;
  /** CSS width for left panel — varies by phase */
  leftWidth: string;
}

// Reusable layout fragments

const COMMON_TABS: PanelSlot[] = ["game-log", "stats", "trade", "chat"];
const ACTIONS_TABS: PanelSlot[] = COMMON_TABS;

/** Narrow sidebar width for compact player board */
const NARROW_LEFT = "clamp(240px, 18vw, 300px)";

/**
 * "Sidebar" — player board in narrow left sidebar, no bottom panel.
 * Used for: most non-actions phases (events, discovery, battles, resolution,
 * kingdom_advantage, legacy_card, taxes, reset, spectating)
 */
const SIDEBAR_LAYOUT: PhaseLayoutConfig = {
  mapSize: "large",
  left: ["player-board"],
  right: [],
  bottom: "empty",
  tabExtras: COMMON_TABS,
  bottomHeight: "0px",
  leftWidth: NARROW_LEFT,
};

/**
 * "Actions" — player board in wide left panel, action board pinned bottom.
 * Used for: actions phase, current player's turn only
 */
const ACTIONS_LAYOUT: PhaseLayoutConfig = {
  mapSize: "compact",
  left: ["player-board"],
  right: [],
  bottom: "action-board",
  tabExtras: ACTIONS_TABS,
  bottomHeight: "40vh",
  leftWidth: "clamp(320px, 24vw, 380px)",
};

/**
 * "Election" — player board in narrow left sidebar, stats in right sidebar.
 * Used for: election phase only
 */
const ELECTION_LAYOUT: PhaseLayoutConfig = {
  mapSize: "compact",
  left: ["player-board"],
  right: ["stats"],
  bottom: "empty",
  tabExtras: COMMON_TABS,
  bottomHeight: "0px",
  leftWidth: "clamp(240px, 20vw, 320px)",
};

// Layout selection keyed off GameStage
import type { GameStage } from "@eots/game";

/**
 * Get layout config for the current game stage.
 * Actions phase gets the wide layout (action board pinned bottom).
 * Election sub-stage gets stats sidebar.
 * Everything else uses the compact sidebar layout.
 */
export const getPhaseLayout = (stage: GameStage, isMyTurn: boolean): PhaseLayoutConfig => {
  if (stage.phase === "actions" && !isMyTurn) return SIDEBAR_LAYOUT;
  if (stage.phase === "actions") return ACTIONS_LAYOUT;
  if (stage.sub === "election" || stage.sub === "immediate_election") return ELECTION_LAYOUT;
  return SIDEBAR_LAYOUT;
};
