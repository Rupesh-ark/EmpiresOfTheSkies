/**
 * Phase-driven layout configuration.
 *
 * Layout is keyed by STAGE (fine-grained), not mood (coarse).
 * Mood drives visual styling (colors, borders); stage drives WHERE panels go.
 */

export type PanelSlot =
  | "map"
  | "action-board"
  | "player-board"
  | "game-log"
  | "stats"
  | "rules"
  | "chat"
  | "trade"
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

const COMMON_TABS: PanelSlot[] = ["game-log", "stats", "trade", "rules", "chat"];

/**
 * "Hidden" — player board not shown anywhere.
 * Used for: kingdom_advantage, legacy_card, taxes, reset, retrieve fleets
 */
const HIDDEN_LAYOUT: PhaseLayoutConfig = {
  mapSize: "large",
  left: [],
  right: [],
  bottom: "empty",
  tabExtras: ["action-board", ...COMMON_TABS],
  bottomHeight: "0px",
  leftWidth: "0px",
};

/**
 * "Tab" — player board lives in the bottom tab strip.
 * Used for: events, discovery, battle phases, resolution
 */
const TAB_LAYOUT: PhaseLayoutConfig = {
  mapSize: "large",
  left: [],
  right: [],
  bottom: "empty",
  tabExtras: ["player-board", "action-board", ...COMMON_TABS],
  bottomHeight: "0px",
  leftWidth: "0px",
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
  tabExtras: COMMON_TABS,
  bottomHeight: "45vh",
  leftWidth: "clamp(380px, 30vw, 450px)",
};

/**
 * "Spectate" — waiting for another player's turn during actions phase.
 * Map large, stats/log/kingdom available in tabs below.
 */
const SPECTATE_LAYOUT: PhaseLayoutConfig = {
  mapSize: "large",
  left: [],
  right: [],
  bottom: "empty",
  tabExtras: ["game-log", "stats", "trade", "rules", "chat"],
  bottomHeight: "0px",
  leftWidth: "0px",
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
  tabExtras: ["action-board", ...COMMON_TABS],
  bottomHeight: "0px",
  leftWidth: "clamp(240px, 20vw, 320px)",
};

// ── Phase → Layout (ctx.phase — authoritative for phase identity) ──────

const PHASE_LAYOUTS: Record<string, PhaseLayoutConfig> = {
  // Hidden — dialog is the focus, player board not needed
  kingdom_advantage: HIDDEN_LAYOUT,
  legacy_card:       HIDDEN_LAYOUT,
  taxes:             HIDDEN_LAYOUT,
  reset:             HIDDEN_LAYOUT,

  // Tab — player board in bottom tab strip
  events:            TAB_LAYOUT,
  discovery:         TAB_LAYOUT,
  aerial_battle:     TAB_LAYOUT,
  ground_battle:     TAB_LAYOUT,
  plunder_legends:   TAB_LAYOUT,
  conquest:          TAB_LAYOUT,
  resolution:        TAB_LAYOUT,

  // Full — player board in wide left panel
  actions:           ACTIONS_LAYOUT,

  // Election — narrow left sidebar
  election:          ELECTION_LAYOUT,
};

// ── Stage → Layout (G.stage — for sub-phase granularity) ───────────────

const STAGE_LAYOUTS: Record<string, PhaseLayoutConfig> = {
  // Hidden sub-stages
  "pick kingdom advantage": HIDDEN_LAYOUT,
  "pick legacy card":       HIDDEN_LAYOUT,
  "resolve round":          HIDDEN_LAYOUT,
  "retrieve fleets":        HIDDEN_LAYOUT,

  // Battle sub-stages (all tab layout)
  "attack or pass":         TAB_LAYOUT,
  "attack or evade":        TAB_LAYOUT,
  "draw or pick card":      TAB_LAYOUT,
  "resolve battle":         TAB_LAYOUT,
  "attack or pass ground":  TAB_LAYOUT,
  "defend ground attack":   TAB_LAYOUT,
  "garrison troops":        TAB_LAYOUT,
  "relocate loser":         TAB_LAYOUT,
  infidel_fleet_combat:     TAB_LAYOUT,
  deferred_battle:          TAB_LAYOUT,

  // Crisis sub-stages
  rebellion:                TAB_LAYOUT,
  rebellion_rival_support:  TAB_LAYOUT,
  invasion:                 TAB_LAYOUT,
  invasion_buyoff:          TAB_LAYOUT,
  invasion_nominate:        TAB_LAYOUT,
  invasion_contribute:      TAB_LAYOUT,
};

/**
 * Get layout config for a given phase + stage.
 * Phase (ctx.phase) is checked first — it's authoritative for phase identity.
 * Stage (G.stage) is checked second — for sub-phase granularity.
 * During the actions phase, non-active players get SPECTATE_LAYOUT.
 * Falls back to HIDDEN_LAYOUT for unknown values.
 */
export const getPhaseLayout = (phase: string, stage: string, isMyTurn: boolean): PhaseLayoutConfig => {
  if (phase === "actions" && !isMyTurn) return SPECTATE_LAYOUT;
  return PHASE_LAYOUTS[phase] ?? STAGE_LAYOUTS[stage] ?? HIDDEN_LAYOUT;
};
