// ─────────────────────────────────────────────────────────────────────────────
// LEGACY RE-EXPORTS — all values now live in theme/tokens.ts
// This file exists so existing imports don't break. New code should import
// from "@/theme" directly.
// ─────────────────────────────────────────────────────────────────────────────

import { tokens } from "./theme/tokens";

export { tokens };

export const colors = {
  orthodox:            tokens.allegiance.orthodox,
  heresy:              tokens.allegiance.heresy,
  svgStroke:           tokens.svg.stroke,
  svgStrokeWidth:      tokens.svg.strokeWidth,
  levyFill:            tokens.svg.levyFill,
  playerOrderTile:     tokens.ui.playerOrderTile,
  zeeland:             tokens.nprKingdom.zeeland,
  venoa:               tokens.nprKingdom.venoa,
  unrevealedTile:      tokens.map.unrevealedTile,
  selectableTileBorder: tokens.map.selectableBorder,
  actionButtonDefault: tokens.ui.actionButtonDefault,
  actionButtonLarge:   tokens.ui.actionButtonLarge,
  loot:                tokens.goods,
  shipyardGold:        tokens.ui.shipyardGold,
  shipyardGrey:        tokens.ui.shipyardGrey,
  tableBorderLight:    tokens.ui.tableBorderLight,
  black:               tokens.ui.black,
  white:               tokens.ui.white,
  home:                tokens.home,
} as const;

export const fonts = {
  primary: tokens.font.display,
  accent:  tokens.font.accent,
  system:  tokens.font.body,
} as const;

export const sizes = {
  cardWidth:  `${tokens.size.card.width}px`,
  cardHeight: `${tokens.size.card.height}px`,
  cardMargin: "5px",
  tileSize:   `${tokens.size.tile.width}px`,
  actionButton: {
    width:       `${tokens.size.slotButton.width}px`,
    height:      `${tokens.size.slotButton.height}px`,
    largeWidth:  `${tokens.size.largeButton.width}px`,
    largeHeight: `${tokens.size.largeButton.height}px`,
  },
  playerBoardButton: {
    width:  `${tokens.size.slotButton.width}px`,
    height: `${tokens.size.slotButton.height}px`,
  },
  fontSize: {
    base:             tokens.fontSize.base,
    small:            tokens.fontSize.small,
    tableCell:        tokens.fontSize.tableCell,
    tooltip:          tokens.fontSize.tooltip,
    tab:              tokens.fontSize.tab,
    chat:             tokens.fontSize.chat,
    tile:             "20px",
    holyDecreeButton: "18px",
  },
  spacing: {
    xs: "5px",
    sm: "10px",
    md: "20px",
    lg: "30px",
  },
} as const;
