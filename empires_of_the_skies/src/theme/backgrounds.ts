/**
 * CSS BACKGROUND PATTERNS
 * ───────────────────────
 * Composable CSS background values for UI surfaces.
 * Image paths come from assets/backgrounds.ts — patterns and gradients live here.
 *
 * Usage:
 *   import { backgrounds } from "@/theme";
 *   <Box sx={{ background: backgrounds.parchment }} />
 *   <Box sx={{ background: backgrounds.river }} />
 */
import { tokens } from "./tokens";
import { BG_PARCHMENT } from "@/assets/backgrounds";

export const backgrounds = {
  /** Parchment texture — tiled, subtle, works on any surface */
  parchment: `url(${BG_PARCHMENT}) center / 600px repeat`,

  /** Parchment with color tint overlay */
  parchmentTinted: `
    linear-gradient(180deg, ${tokens.ui.surface}dd 0%, ${tokens.ui.surface}cc 100%),
    url(${BG_PARCHMENT}) center / 600px repeat
  `.trim(),

  /** Animated river flow — teal gradient blobs (use with animation class) */
  river: `
    radial-gradient(ellipse 35% 60% at 12% 25%,  rgba(45,107,90,0.9) 0%, transparent 70%),
    radial-gradient(ellipse 20% 80% at 35% 60%,  rgba(45,107,90,0.8) 0%, transparent 65%),
    radial-gradient(ellipse 30% 45% at 60% 20%,  rgba(45,107,90,0.7) 0%, transparent 60%),
    radial-gradient(ellipse 25% 70% at 80% 70%,  rgba(45,107,90,0.85) 0%, transparent 65%),
    radial-gradient(ellipse 18% 50% at 50% 90%,  rgba(45,107,90,0.6) 0%, transparent 55%)
  `.trim(),

  /** Subtle teal wash — static, no animation needed */
  tealWash: `
    radial-gradient(ellipse 50% 50% at 30% 40%, ${tokens.ui.tealMuted} 0%, transparent 70%),
    radial-gradient(ellipse 40% 60% at 70% 60%, ${tokens.ui.tealMuted} 0%, transparent 70%)
  `.trim(),

  /** Dark wood panel (like the resource tracker bar) */
  darkWood: "linear-gradient(180deg, #5C4A38 0%, #4A3A2A 50%, #3E3020 100%)",

  /** Recessed gauge (dark inset panel) */
  recessedGauge: "linear-gradient(180deg, #4A3C2C 0%, #3E3020 100%)",

  /** Surface gradient (raised panel feel) */
  surfaceGradient: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,

  /** Gold left-accent stripe (for action rows) */
  goldAccent: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,

  /** Gold accent intensified (hover state) */
  goldAccentHover: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}88 60%, ${tokens.ui.gold}22 100%)`,
} as const;
