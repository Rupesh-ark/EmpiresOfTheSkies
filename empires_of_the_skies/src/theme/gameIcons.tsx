/**
 * Game Icon Mapping — Single source of truth for all game icons.
 *
 * Uses react-icons/gi (game-icons.net, CC BY 3.0).
 * Attribution: Icons by Lorc, Delapouite & contributors via game-icons.net
 *
 * Change an icon here and it updates everywhere in the UI.
 */
import {
  GiCrown,
  GiTwoCoins,
  GiLaurelCrown,
  GiCrossedSwords,
  GiHelmet,
  GiShield,
  GiZeppelin,
  GiSwordBrandish,
  GiChurch,
  GiIndianPalace,
  GiFactory,
  GiPrisoner,
  GiWatchtower,
  GiVillage,
  GiMilitaryFort,
  GiCastle,
} from "react-icons/gi";

// ── Resource icons ──────────────────────────────────────────────────────

export const IconCounsellor = GiCrown;
export const IconGold = GiTwoCoins;
export const IconVP = GiLaurelCrown;

// ── Military icons ──────────────────────────────────────────────────────

export const IconRegiment = GiCrossedSwords;
export const IconElite = GiHelmet;
export const IconLevy = GiShield;
export const IconSkyship = GiZeppelin;
export const IconFoWCard = GiSwordBrandish;

// ── Building icons ──────────────────────────────────────────────────────

export const IconCathedral = GiChurch;
export const IconPalace = GiIndianPalace;
export const IconShipyard = GiZeppelin;
export const IconFactory = GiFactory;
export const IconFort = GiMilitaryFort;

// ── Territory icons ─────────────────────────────────────────────────────

export const IconOutpost = GiWatchtower;
export const IconColony = GiVillage;
export const IconPrisoner = GiPrisoner;

// ── Allegiance icons ────────────────────────────────────────────────────

export const IconOrthodox = GiChurch;
export const IconHeretic = GiCastle;
