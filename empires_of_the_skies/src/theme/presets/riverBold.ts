import type { TokenPreset } from "./types";

/**
 * RIVER BOLD PRESET — Aggressive Contrast
 * ─────────────────────────────────────────
 * Same direction as 'river' but pushed further.
 * Background drops to 73% — very visible zone separation.
 * Mood tints at 20-25% — impossible to miss phase changes.
 * Use this if 'river' still feels too subtle.
 */
export const riverBoldPreset: TokenPreset = {
  name: "riverBold",
  description: "Aggressive contrast — deep gutters, bold moods, strong teal presence",

  ui: {
    background:    "#BBB0A0",                  // 73% — deep parchment, strong gutters
    surface:       "#D8CEBC",                  // 83% — big jump from background
    surfaceRaised: "#F0E8D8",                  // 92% — dialogs really pop
    surfaceHover:  "#CEC4B2",                  // 80% — distinct hover
    border:        "rgba(120,90,50,0.45)",     // heavy borders
    borderMedium:  "rgba(120,90,50,0.60)",
    borderFocus:   "rgba(160,110,30,0.80)",
    teal:          "#256B55",                  // slightly deeper teal
    tealLight:     "#348A6E",                  // brighter hover
    tealMuted:     "rgba(45,107,90,0.22)",     // stronger teal wash
  },

  mood: {
    // Bold mood tints — phase changes are unmistakable
    peacetime: { accent: "#B8860B", bg: "rgba(184,134,11,0.20)",  border: "rgba(184,134,11,0.55)" },
    battle:    { accent: "#C0392B", bg: "rgba(192,57,43,0.22)",   border: "rgba(192,57,43,0.65)" },
    election:  { accent: "#8E44AD", bg: "rgba(142,68,173,0.20)",  border: "rgba(142,68,173,0.55)" },
    discovery: { accent: "#2874A6", bg: "rgba(40,116,166,0.20)",  border: "rgba(40,116,166,0.55)" },
    crisis:    { accent: "#D4820A", bg: "rgba(212,130,10,0.22)",  border: "rgba(212,130,10,0.60)" },
  },

  shadow: {
    sm: "0 1px 4px rgba(80,60,30,0.28)",
    md: "0 4px 14px rgba(80,60,30,0.25)",
    lg: "0 8px 28px rgba(80,60,30,0.30)",
  },
};
