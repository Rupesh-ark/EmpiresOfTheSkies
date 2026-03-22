/**
 * BASE TOKEN DEFINITIONS
 * ──────────────────────
 * All token keys and their default (classic) values live here.
 * Presets override specific values — see presets/ directory.
 * Do NOT import this file directly — import from tokens.ts instead.
 */
export const baseTokens = {
  // ── Kingdom palette (player colors from the game) ──────────────────────────
  kingdom: {
    angland:     "#DC5454",   // red
    constantium: "#478779",   // green
    nordmark:    "#F5DE48",   // yellow
    gallois:     "#51658D",   // blue
    castillia:   "#A0522D",   // brown
    ostreich:    "#E6EFE9",   // white/cream
  },

  // ── NPR (non-player realm) kingdom colors ──────────────────────────────────
  nprKingdom: {
    zeeland: "#FE9F10",
    venoa:   "#FE9ACC",
  },

  // ── Religious allegiance ───────────────────────────────────────────────────
  allegiance: {
    orthodox: "#8A3570",      // dark purple — 4.5:1 on surface (AA)
    heresy:   "#8A4D00",      // dark orange — 4.6:1 on surface (AA)
  },

  // ── Semantic UI colors (parchment light theme) ─────────────────────────────
  ui: {
    background:    "#E8DEC8",       // aged parchment
    surface:       "#F0E8D4",       // lighter parchment panel
    surfaceRaised: "#F5EEE0",       // raised card
    surfaceHover:  "#EDE4CE",       // hover — slightly darker
    border:        "rgba(120,90,50,0.18)",
    borderMedium:  "rgba(120,90,50,0.30)",
    borderFocus:   "rgba(160,110,30,0.55)",
    text:          "#3A2E22",       // dark walnut ink
    textMuted:     "#7A6A55",       // faded ink
    textBright:    "#2A1E12",       // darkest ink
    gold:          "#B8860B",       // dark gold / antique brass
    danger:        "#A82E22",       // deep crimson — 4.8:1 on surface (AA)
    success:       "#1E6B25",       // forest green — 5.0:1 on surface (AA)
    warning:       "#7A4E05",       // dark amber — 4.8:1 on surface (AA)
    info:          "#1D5F8A",       // dark blue — 4.7:1 on surface (AA)

    // Secondary accent (river teal) — empty in classic, filled by presets
    teal:          "",
    tealLight:     "",
    tealMuted:     "",

    // Action board button colors
    actionButtonDefault: "#5C4A38",
    actionButtonLarge:   "#2E7D32",

    // Player-order tile accent
    playerOrderTile: "#5DADE2",

    // Misc UI neutrals retained for backward compatibility
    tableBorderLight: "rgba(120,90,50,0.15)",
    shipyardGold:     "#B8860B",
    shipyardGrey:     "#7A6A55",
    black:            "#000000",
    white:            "#ffffff",
  },

  // ── Goods colors ───────────────────────────────────────────────────────────
  goods: {
    mithril:      "#ECEDED",
    magicDust:    "#F6B1B5",
    dragonScales: "#52A6B2",
    krakenSkin:   "#B1AC7E",
    stickyIchor:  "#008BD2",
    pipeweed:     "#AE9675",
  },

  // ── Mood palettes (per game phase — warm parchment accents) ─────────────────
  mood: {
    peacetime: { accent: "#B8860B", bg: "rgba(184,134,11,0.06)",  border: "rgba(184,134,11,0.25)" },
    battle:    { accent: "#A82E22", bg: "rgba(168,46,34,0.08)",   border: "rgba(168,46,34,0.35)"  },
    election:  { accent: "#7A3899", bg: "rgba(122,56,153,0.07)",  border: "rgba(122,56,153,0.25)" },
    discovery: { accent: "#1D5F8A", bg: "rgba(29,95,138,0.07)",   border: "rgba(29,95,138,0.25)" },
    crisis:    { accent: "#7A4E05", bg: "rgba(122,78,5,0.08)",    border: "rgba(122,78,5,0.30)" },
  },

  // ── Typography ─────────────────────────────────────────────────────────────
  font: {
    display: "dauphinn",
    body:    "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    accent:  '"Cinzel", serif',
  },

  fontSize: {
    xs:   12,
    sm:   14,
    base: 20,
    md:   18,
    lg:   22,
    xl:   28,
    xxl:  36,

    // Named aliases matching old sizes.fontSize keys
    small:      18,
    tableCell:  18.5,
    tooltip:    18,
    tab:        26,
    chat:       16,
  },

  // ── Spacing ────────────────────────────────────────────────────────────────
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  // ── Shadows ────────────────────────────────────────────────────────────────
  shadow: {
    sm:   "0 1px 3px rgba(80,60,30,0.15)",
    md:   "0 4px 12px rgba(80,60,30,0.12)",
    lg:   "0 8px 24px rgba(80,60,30,0.15)",
    glow: (color: string) => `0 0 8px ${color}30, 0 0 3px ${color}15`,
  },

  // ── Border radii ───────────────────────────────────────────────────────────
  radius: {
    sm:   4,
    md:   8,
    lg:   12,
    card: 8,
    pill: 999,
  },

  // ── Transitions ────────────────────────────────────────────────────────────
  transition: {
    fast:   "150ms ease",
    normal: "250ms ease",
    slow:   "400ms ease",
  },

  // ── Component sizes ────────────────────────────────────────────────────────
  size: {
    card:        { width: 137, height: 250 },
    tile:        { width: 150, height: 150 },
    slotButton:  { width: 98,  height: 50  },
    largeButton: { width: 180, height: 150 },
    iconSm: 20,
    iconMd: 28,
    iconLg: 40,
  },

  // ── Map colors ─────────────────────────────────────────────────────────────
  map: {
    unrevealedTile:   "#298932",
    selectableBorder: "#F5DE48",
    infidelEmpire:    "#8B0000",
  },

  // ── SVG rendering ──────────────────────────────────────────────────────────
  svg: {
    stroke:      "#1A1A18",
    strokeWidth: "0.288",
    levyFill:    "#B1B2B2",
  },

  // ── Desktop breakpoints (no mobile/tablet — game is desktop-only) ──────────
  breakpoint: {
    laptop:    1366,   // 13-14" laptops (1366×768)
    desktop:   1920,   // standard 1080p monitors
    wide:      2560,   // 1440p / ultrawide
  },

  // ── Home page / lobby (warm parchment palette) ─────────────────────────────
  home: {
    text:               "#3e2723",
    border:             "#a67c52",
    gradientTop:        "#2c6e49",
    gradientBottom:     "#1b4d3e",
    gradientTopHover:   "#1b5e20",
    gradientBottomHover:"#134e35",
    parchmentBg:        "rgba(240, 230, 210, 0.75)",
    textFieldBg:        "rgba(255, 255, 255, 0.6)",
    hoverBronze:        "#d2b48c",
    darkBrown:          "#5c4033",
    darkerBrown:        "#4d3122",
    creamButton:        "rgba(250, 245, 235, 0.9)",
    creamButtonSolid:   "rgba(250, 245, 235, 1)",
    disabledBg:         "rgba(0, 0, 0, 0.05)",
    disabledBorder:     "rgba(0, 0, 0, 0.2)",
    disabledText:       "rgba(0, 0, 0, 0.5)",
    shadowOverlay:      "rgba(0, 0, 0, 0.5)",
  },
} as const;

export type Tokens = typeof baseTokens;
