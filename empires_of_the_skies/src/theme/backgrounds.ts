/**
 * CSS BACKGROUND PATTERNS
 * ───────────────────────
 * Composable CSS background values for UI surfaces.
 * Image paths come from assets/backgrounds.ts — patterns and gradients live here.
 *
 * Usage:
 *   import { backgrounds } from "@/theme";
 *   <Box sx={{ background: backgrounds.parchmentPanel }} />
 *   <Box sx={{ background: backgrounds.darkWoodTexture }} />
 */
import { tokens } from "./tokens";
import {
  BG_PARCHMENT,
  BG_PARCHMENT_PANEL,
  BG_RIVER,
  BG_LEATHER,
  BG_ORNATE_BORDER,
  BG_SECTION_DIVIDER,
  BG_MAP_FOG,
} from "@/assets/backgrounds";

export const backgrounds = {
  // ── Image-based textures ─────────────────────────────────────────────────

  /** Original parchment texture — tiled, subtle */
  parchment: `url(${BG_PARCHMENT}) center / 600px repeat`,

  /** Parchment panel texture — for sidebars, action board, tab drawers */
  parchmentPanel: `url(${BG_PARCHMENT_PANEL}) center / 800px repeat`,

  /** Parchment panel with surface color overlay for readability */
  parchmentPanelTinted: `
    linear-gradient(180deg, ${tokens.ui.surface}dd 0%, ${tokens.ui.surface}cc 100%),
    url(${BG_PARCHMENT_PANEL}) center / 800px repeat
  `.trim(),

  /** River water — aerial satellite texture for game background */
  riverTexture: `url(${BG_RIVER}) center / cover no-repeat`,

  /** Leather button — for primary action buttons */
  leatherTexture: `url(${BG_LEATHER}) center / cover no-repeat`,

  /** Ornate border frame — for dialogs and card frames */
  ornateBorder: BG_ORNATE_BORDER,

  /** Section divider banner — for section headers */
  sectionDivider: BG_SECTION_DIVIDER,

  /** Map fog overlay — for unrevealed tiles */
  mapFog: `url(${BG_MAP_FOG}) center / cover no-repeat`,

  // ── CSS gradient patterns (no images) ────────────────────────────────────

  /** Parchment with color tint overlay */
  parchmentTinted: `
    linear-gradient(180deg, ${tokens.ui.surface}dd 0%, ${tokens.ui.surface}cc 100%),
    url(${BG_PARCHMENT}) center / 600px repeat
  `.trim(),

  /** Animated river flow — teal gradient blobs (use with .game-layout-root animation) */
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

  /** Dark wood panel — CSS-only fallback */
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
