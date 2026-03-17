export const tokens = {
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
    orthodox: "#A74383",      // purple
    heresy:   "#E77B00",      // orange
  },

  // ── Semantic UI colors (dark theme) ────────────────────────────────────────
  ui: {
    background:    "#0d1117",
    surface:       "#161b22",
    surfaceRaised: "#1c2333",
    surfaceHover:  "#21262d",
    border:        "rgba(255,255,255,0.08)",
    borderMedium:  "rgba(255,255,255,0.15)",
    borderFocus:   "rgba(255,255,255,0.3)",
    text:          "#e6edf3",
    textMuted:     "#8b949e",
    textBright:    "#ffffff",
    gold:          "#D7B469",
    danger:        "#ef4444",
    success:       "#22c55e",
    warning:       "#f59e0b",
    info:          "#3b82f6",

    // Action board button colors
    actionButtonDefault: "#e0e0e0",
    actionButtonLarge:   "#5ebf85",

    // Player-order tile accent
    playerOrderTile: "#9EE8FF",

    // Misc UI neutrals retained for backward compatibility
    tableBorderLight: "#EAEAEA",
    shipyardGold:     "#D7B469",
    shipyardGrey:     "#D9DADA",
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

  // ── Mood palettes (per game phase) ─────────────────────────────────────────
  mood: {
    peacetime: { accent: "#D7B469", bg: "rgba(215,180,105,0.04)", border: "rgba(215,180,105,0.15)" },
    battle:    { accent: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.25)"  },
    election:  { accent: "#A74383", bg: "rgba(167,67,131,0.05)",  border: "rgba(167,67,131,0.2)" },
    discovery: { accent: "#3b82f6", bg: "rgba(59,130,246,0.05)",  border: "rgba(59,130,246,0.2)" },
    crisis:    { accent: "#f59e0b", bg: "rgba(245,158,11,0.05)",  border: "rgba(245,158,11,0.2)" },
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
    sm:   "0 1px 3px rgba(0,0,0,0.4)",
    md:   "0 4px 12px rgba(0,0,0,0.5)",
    lg:   "0 8px 24px rgba(0,0,0,0.6)",
    glow: (color: string) => `0 0 12px ${color}40, 0 0 4px ${color}20`,
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
