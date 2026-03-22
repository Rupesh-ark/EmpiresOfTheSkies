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

// ── Reusable layout fragments ──────────────────────────────────────────

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

// ── Phase → Layout (ctx.phase — authoritative for phase identity) ──────

const PHASE_LAYOUTS: Record<string, PhaseLayoutConfig> = {
  // Sidebar — player board always visible, narrow
  kingdom_advantage: SIDEBAR_LAYOUT,
  legacy_card:       SIDEBAR_LAYOUT,
  taxes:             SIDEBAR_LAYOUT,
  reset:             SIDEBAR_LAYOUT,
  events:            SIDEBAR_LAYOUT,
  discovery:         SIDEBAR_LAYOUT,
  aerial_battle:     SIDEBAR_LAYOUT,
  ground_battle:     SIDEBAR_LAYOUT,
  plunder_legends:   SIDEBAR_LAYOUT,
  conquest:          SIDEBAR_LAYOUT,
  resolution:        SIDEBAR_LAYOUT,

  // Full — player board in wide left panel
  actions:           ACTIONS_LAYOUT,

  // Election — narrow left sidebar + stats right
  election:          ELECTION_LAYOUT,
};

// ── Stage → Layout (G.stage — for sub-phase granularity) ───────────────

const STAGE_LAYOUTS: Record<string, PhaseLayoutConfig> = {
  // All sub-stages use sidebar layout
  "pick kingdom advantage": SIDEBAR_LAYOUT,
  "pick legacy card":       SIDEBAR_LAYOUT,
  "resolve round":          SIDEBAR_LAYOUT,
  "retrieve fleets":        SIDEBAR_LAYOUT,

  // Battle sub-stages
  "attack or pass":         SIDEBAR_LAYOUT,
  "attack or evade":        SIDEBAR_LAYOUT,
  "draw or pick card":      SIDEBAR_LAYOUT,
  "resolve battle":         SIDEBAR_LAYOUT,
  "attack or pass ground":  SIDEBAR_LAYOUT,
  "defend ground attack":   SIDEBAR_LAYOUT,
  "garrison troops":        SIDEBAR_LAYOUT,
  "relocate loser":         SIDEBAR_LAYOUT,
  infidel_fleet_combat:     SIDEBAR_LAYOUT,
  deferred_battle:          SIDEBAR_LAYOUT,

  // Crisis sub-stages
  rebellion:                SIDEBAR_LAYOUT,
  rebellion_rival_support:  SIDEBAR_LAYOUT,
  invasion:                 SIDEBAR_LAYOUT,
  invasion_buyoff:          SIDEBAR_LAYOUT,
  invasion_nominate:        SIDEBAR_LAYOUT,
  invasion_contribute:      SIDEBAR_LAYOUT,
};

/**
 * Get layout config for a given phase + stage.
 * Phase (ctx.phase) is checked first — it's authoritative for phase identity.
 * Stage (G.stage) is checked second — for sub-phase granularity.
 * During the actions phase, non-active players get SIDEBAR_LAYOUT (spectate with kingdom visible).
 * Falls back to SIDEBAR_LAYOUT for unknown values.
 */
export const getPhaseLayout = (phase: string, stage: string, isMyTurn: boolean): PhaseLayoutConfig => {
  if (phase === "actions" && !isMyTurn) return SIDEBAR_LAYOUT;
  return PHASE_LAYOUTS[phase] ?? STAGE_LAYOUTS[stage] ?? SIDEBAR_LAYOUT;
};
