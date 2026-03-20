import type { TokenPreset } from "./types";

/**
 * RIVER PRESET — Enhanced Visibility
 * ────────────────────────────────────
 * Inspired by NASA's satellite river image: deep teal cutting through desert sand.
 *
 * Key changes:
 *   1. Wider lightness range: 78% → 93% (16% spread vs classic's 6%)
 *      Background drops to a darker parchment — "wooden table showing through gaps"
 *   2. River teal (#2D6B5A) as secondary accent for structural/static elements
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
    border:        "rgba(120,90,50,0.35)",     // was 0.18 — actually visible now
    borderMedium:  "rgba(120,90,50,0.50)",     // was 0.30
    borderFocus:   "rgba(160,110,30,0.70)",    // was 0.55
    gold:          "#2D6B5A",                  // river teal replaces gold as primary accent
    shipyardGold:  "#2D6B5A",                  // shipyard accent matches new gold
    teal:          "#2D6B5A",                  // river green — secondary accent
    tealLight:     "#3A7D6A",                  // hover/lighter variant
    tealMuted:     "rgba(45,107,90,0.15)",     // subtle teal wash for backgrounds
  },

  mood: {
    // Accent hues unchanged — only intensity scaled for darker base
    peacetime: { accent: "#2D6B5A", bg: "rgba(45,107,90,0.14)",   border: "rgba(45,107,90,0.45)" },
    battle:    { accent: "#C0392B", bg: "rgba(192,57,43,0.16)",   border: "rgba(192,57,43,0.55)" },
    election:  { accent: "#8E44AD", bg: "rgba(142,68,173,0.14)",  border: "rgba(142,68,173,0.45)" },
    discovery: { accent: "#2874A6", bg: "rgba(40,116,166,0.14)",  border: "rgba(40,116,166,0.45)" },
    crisis:    { accent: "#D4820A", bg: "rgba(212,130,10,0.16)",  border: "rgba(212,130,10,0.50)" },
  },

  shadow: {
    sm: "0 1px 3px rgba(80,60,30,0.22)",      // was 0.15
    md: "0 4px 12px rgba(80,60,30,0.20)",      // was 0.12
    lg: "0 8px 24px rgba(80,60,30,0.25)",      // was 0.15
  },
};
