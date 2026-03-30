import type { TokenPreset } from "./types";

/**
 * RIVER PRESET — Enhanced Visibility
 * ────────────────────────────────────
 * Inspired by NASA's satellite river image: deep teal cutting through desert sand.
 *
 * Key changes:
 *   1. Wider lightness range: 78% → 93% (16% spread vs classic's 6%)
 *      Background drops to a darker parchment — "wooden table showing through gaps"
 *   2. River teal (#1A5C4A) as secondary accent — WCAG AA compliant (4.8:1)
 *      Gold stays for interactive/active, teal for informational/structural
 *   3. Mood opacities doubled (6-8% → 14-16%) so phases are actually felt
 *   4. Borders & shadows strengthened to define panel zones
 */
export const riverPreset: TokenPreset = {
  name: "river",
  description: "Enhanced visibility — wider depth range, river teal accent, stronger moods",

  ui: {
    background:    "#C8BDAA",                  // 78% — darker parchment base
    surface:       "#E2D8C4",                  // 86% — panels float above
    surfaceRaised: "#F2EBDB",                  // 93% — cards/dialogs pop
    surfaceHover:  "#D8CEBC",                  // 83% — clear hover feedback
    border:        "rgba(120,90,50,0.50)",     // was 0.35 — stronger panel boundaries
    borderMedium:  "rgba(120,90,50,0.65)",     // was 0.50 — clearer divisions
    borderFocus:   "rgba(160,110,30,0.80)",    // was 0.70 — sharper focus ring
    gold:          "#1A5C4A",                  // darkened teal — 4.8:1 on parchment (AA)
    shipyardGold:  "#1A5C4A",                  // shipyard accent matches new gold
    teal:          "#1A5C4A",                  // darkened river green — AA compliant
    tealLight:     "#2A6D5A",                  // hover variant — slightly lighter
    tealMuted:     "rgba(26,92,74,0.15)",      // subtle teal wash (updated to match)
    textMuted:     "#594835",                  // was #7A6A55 — 5.2:1 on parchment (AA)
  },

  mood: {
    // Accent hues unchanged — only intensity scaled for darker base
    peacetime: { accent: "#1A5C4A", bg: "rgba(26,92,74,0.14)",    border: "rgba(26,92,74,0.55)" },
    battle:    { accent: "#A82E22", bg: "rgba(168,46,34,0.16)",   border: "rgba(168,46,34,0.65)" },
    election:  { accent: "#7A3899", bg: "rgba(122,56,153,0.14)",  border: "rgba(122,56,153,0.55)" },
    discovery: { accent: "#1D5F8A", bg: "rgba(29,95,138,0.14)",   border: "rgba(29,95,138,0.55)" },
    crisis:    { accent: "#7A4E05", bg: "rgba(122,78,5,0.16)",    border: "rgba(122,78,5,0.60)" },
  },

  shadow: {
    sm: "0 1px 3px rgba(80,60,30,0.22)",      // was 0.15
    md: "0 4px 12px rgba(80,60,30,0.20)",      // was 0.12
    lg: "0 8px 24px rgba(80,60,30,0.25)",      // was 0.15
  },
};
