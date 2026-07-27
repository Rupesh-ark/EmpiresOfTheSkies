/**
 * CSS BACKGROUND PATTERNS
 *
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
  // Image-based textures

  /** Original parchment texture — tiled, subtle */
  parchment: `url(${BG_PARCHMENT}) center / 600px repeat`,

  /** Parchment panel texture — for sidebars, action board, tab drawers */
  parchmentPanel: `url(${BG_PARCHMENT_PANEL}) center / 800px repeat`,

  /**
   * Content-zone surface — parchment with the texture at a whisper.
   *
   * Bundled as one object because the recipe has to travel together: an
   * earlier version needed a companion `backgroundBlendMode` at every call
   * site, and the one place that forgot it looked different from the rest.
   *
   * Deliberately NOT multiply — multiply modulates by the texture no matter
   * how opaque the layer above, so the pattern stayed loud however far the
   * alpha was pushed. Plain compositing at 95% leaves 5% grain, which is
   * what "aged paper" should be.
   */
  panelSurface: {
    background: `
      linear-gradient(180deg, ${tokens.ui.surface}f2 0%, ${tokens.ui.surface}ee 100%),
      url(${BG_PARCHMENT_PANEL}) center / 800px repeat
    `.trim(),
    backgroundColor: tokens.ui.surface,
  },

  /** River water — aerial satellite texture for game background */
  riverTexture: `url(${BG_RIVER}) center / cover no-repeat`,

  /** Leather button — for primary action buttons */
  leatherTexture: `url(${BG_LEATHER}) center / cover no-repeat`,

  /** Dark leather bar — top strip, prompt bar, and other frame chrome */
  leatherBar: `
    linear-gradient(180deg, rgba(46,33,18,0.90) 0%, rgba(30,21,11,0.94) 100%),
    url(${BG_LEATHER}) center / 420px repeat
  `.trim(),

  /** Polished brass ring — heresy gauge frame, rail medallions */
  brassBezel: "linear-gradient(180deg, #9a7d3e 0%, #6b5423 60%, #8a6d34 100%)",

  /** Ornate border frame — for dialogs and card frames */
  ornateBorder: BG_ORNATE_BORDER,

  /** Section divider banner — for section headers */
  sectionDivider: BG_SECTION_DIVIDER,

  /** Map fog overlay — for unrevealed tiles */
  mapFog: `url(${BG_MAP_FOG}) center / cover no-repeat`,

  // CSS gradient patterns (no images)

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

  /**
   * Enamel pin — the shared material for player markers (rail medallions,
   * heresy track pins). A tight offset specular plus bounce light and vertical
   * shading over flat kingdom colour. The old version ramped white from 0% to
   * ~46% of the radius, which blew out a third of the sphere.
   */
  enamel: (colour: string) =>
    `
    radial-gradient(circle at 32% 26%, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.13) 15%, rgba(255,255,255,0) 33%),
    radial-gradient(circle at 50% 118%, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0) 44%),
    linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0) 44%, rgba(0,0,0,0.32) 100%),
    ${colour}
  `.trim(),

  /**
   * Action-row surface — the frame's vocabulary for anything clickable that
   * sits on parchment: raised gradient, brass hairline, gold edge stripe.
   * Shared so the dock and Musters read as the same system as the board.
   */
  actionSurface: {
    position: "relative" as const,
    overflow: "hidden",
    background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
    borderRadius: `${tokens.radius.md}px`,
    border: `1px solid ${tokens.ui.border}`,
    borderTop: `1px solid ${tokens.ui.gold}22`,
    borderLeft: "3px solid transparent",
    "&::before": {
      content: '""',
      position: "absolute",
      left: -3,
      top: 0,
      bottom: 0,
      width: 3,
      borderRadius: `${tokens.radius.md}px 0 0 ${tokens.radius.md}px`,
      background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
      transition: `background ${tokens.transition.fast}`,
    },
  },
} as const;
