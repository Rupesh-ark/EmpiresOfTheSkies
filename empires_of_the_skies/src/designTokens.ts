// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const colors = {
  // Game mechanics
  orthodox: "#A74383",      // purple — Orthodox allegiance
  heresy: "#E77B00",        // orange — Heresy allegiance

  // SVG / icon outlines
  svgStroke: "#1A1A18",
  svgStrokeWidth: "0.288",

  // Unit fills
  levyFill: "#B1B2B2",      // neutral grey — levy troops

  // Player-order tile accent
  playerOrderTile: "#9EE8FF",

  // Fixed kingdom colours
  zeeland: "#FE9F10",
  venoa: "#FE9ACC",

  // World map tiles
  unrevealedTile: "#298932",       // forest green back-face
  selectableTileBorder: "yellow",

  // Action board buttons
  actionButtonDefault: "#e0e0e0",  // small button default bg
  actionButtonLarge: "#5ebf85",    // large button bg

  // Loot goods
  loot: {
    mithril: "#ECEDED",
    magicDust: "#F6B1B5",
    dragonScales: "#52A6B2",
    krakenSkin: "#B1AC7E",
    stickyIchor: "#008BD2",
    pipeweed: "#AE9675",
  },

  // Shipyard / resource icons
  shipyardGold: "#D7B469",
  shipyardGrey: "#D9DADA",

  // UI neutrals
  tableBorderLight: "#EAEAEA",
  black: "#000000",
  white: "#ffffff",

  // Home page / lobby
  home: {
    text: "#3e2723",              // aged ink brown
    border: "#a67c52",            // bronze
    gradientTop: "#2c6e49",       // forest green
    gradientBottom: "#1b4d3e",
    gradientTopHover: "#1b5e20",
    gradientBottomHover: "#134e35",
    parchmentBg: "rgba(240, 230, 210, 0.75)",
    textFieldBg: "rgba(255, 255, 255, 0.6)",
    hoverBronze: "#d2b48c",
    darkBrown: "#5c4033",
    darkerBrown: "#4d3122",
    creamButton: "rgba(250, 245, 235, 0.9)",
    creamButtonSolid: "rgba(250, 245, 235, 1)",
    disabledBg: "rgba(0, 0, 0, 0.05)",
    disabledBorder: "rgba(0, 0, 0, 0.2)",
    disabledText: "rgba(0, 0, 0, 0.5)",
    shadowOverlay: "rgba(0, 0, 0, 0.5)",
  },
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const fonts = {
  primary: "dauphinn",
  accent: '"Cinzel", serif',
  system: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
} as const;

// ---------------------------------------------------------------------------
// Sizes & dimensions
// ---------------------------------------------------------------------------

export const sizes = {
  // Fortune-of-War / Legacy cards
  cardWidth: "137px",
  cardHeight: "250px",
  cardMargin: "5px",

  // World-map tiles
  tileSize: "150px",

  // Action board buttons
  actionButton: {
    width: "98px",
    height: "50px",
    largeWidth: "180px",
    largeHeight: "150px",
  },

  // Player board buttons
  playerBoardButton: {
    width: "98px",
    height: "50px",
  },

  // Fonts (numeric, for MUI theme)
  fontSize: {
    base: 20,
    small: 18,
    tableCell: 18.5,
    tooltip: 18,
    tab: 26,
    chat: 16,
    tile: "20px",
    holyDecreeButton: "18px",
  },

  // Common spacing
  spacing: {
    xs: "5px",
    sm: "10px",
    md: "20px",
    lg: "30px",
  },
} as const;