import { EventCardName, FortuneOfWarCardInfo, InfidelHostCounter, KingdomAdvantageCard, KingdomName, LegacyCardInfo } from "../types";

// ── Game configuration ────────────────────────────────────────────────────────

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 1;

// ── Map dimensions ────────────────────────────────────────────────────────────
export const MAP_WIDTH = 8;
export const MAP_HEIGHT = 4;

// ── Heresy track bounds ───────────────────────────────────────────────────────
export const HERESY_MAX = 9;
export const HERESY_MIN = -9;

// ── Price marker bounds ───────────────────────────────────────────────────────
export const PRICE_MARKER_MAX = 4;
export const PRICE_MARKER_MIN = 1;
export const FINAL_ROUND = 4;
export const BASE_GOLD_INCOME = 4;
export const MAX_COUNSELLORS = 7;
export const MAX_FACTORIES = 6;
export const MAX_HERESY = 19;
export const MAX_LEVIES = 12;

// ── Building limits ──────────────────────────────────────────────────────────
export const MAX_CATHEDRALS = 6;
export const MAX_PALACES = 6;
export const MAX_SHIPYARDS = 3;

// ── Building sell prices ─────────────────────────────────────────────────────
export const BUILDING_SELL_PRICE = 3;
export const SKYSHIP_SELL_PRICE = 1;

// ── Building VP rewards ──────────────────────────────────────────────────────
export const CATHEDRAL_VP = 2;
export const PALACE_VP_HERETIC = 2;
export const PALACE_VP_ORTHODOX = 1;

// ── Fleet & troop caps ──────────────────────────────────────────────────────
export const MAX_SKYSHIPS_PER_FLEET = 5;
export const MAX_SKYSHIPS = 24;
export const MAX_REGIMENTS = 30;

// ── Kingdom location (home base) ─────────────────────────────────────────────
export const KINGDOM_LOCATION: [number, number] = [4, 0];

// ── Punish Dissenters ────────────────────────────────────────────────────────
export const BASE_PRISONERS = 3;
export const MORE_PRISONS_BONUS = 1;
export const PUNISH_GOLD_COST = 2;
export const PUNISH_EXECUTE_VP_COST = 1;

// ── Infidel Host counters ────────────────────────────────────────────────────
export const INFIDEL_EMPIRE_LOCATION: [number, number] = [4, 1];

// Config-driven: change count to adjust pool size
export const INFIDEL_HOST_CONFIG: (InfidelHostCounter & { count: number })[] = [
  { swords: 30, shields: 0, isFleet: false, isInvasionTrigger: true, count: 2 },
  { swords: 20, shields: 0, isFleet: false, isInvasionTrigger: false, count: 3 },
  { swords: 15, shields: 0, isFleet: false, isInvasionTrigger: false, count: 3 },
  { swords: 10, shields: 0, isFleet: false, isInvasionTrigger: false, count: 3 },
  { swords: 15, shields: 5, isFleet: true, isInvasionTrigger: false, count: 1 },
];
export const INFIDEL_HOST_COUNTERS: InfidelHostCounter[] =
  INFIDEL_HOST_CONFIG.flatMap(({ count, ...counter }) =>
    Array.from({ length: count }, () => ({ ...counter }))
  );

// Grand Army VP rewards/penalties
export const CAPTAIN_GENERAL_VP = 3;
export const LARGEST_FORCE_VP = 5;
export const SECOND_LARGEST_VP = 2;
export const TIED_LARGEST_VP = 4;

// Number of kingdoms (for Grand Army contingent draws)
export const TOTAL_KINGDOMS = 6;

// ── Event cards ──────────────────────────────────────────────────────────────
export const EVENT_HAND_SIZE = 3;

// ── Contingent counters (Rebels / Grand Army) ────────────────────────────────
// Config-driven: change count to adjust pool size
export const CONTINGENT_CONFIG: { swords: number; count: number }[] = [
  { swords: 15, count: 1 },
  { swords: 12, count: 5 },
  { swords: 10, count: 7 },
  { swords: 7, count: 7 },
];
export const CONTINGENT_COUNTERS: number[] =
  CONTINGENT_CONFIG.flatMap(({ swords, count }) =>
    Array(count).fill(swords)
  );

// ── Fortune of War ───────────────────────────────────────────────────────────
export const FOW_CARDS_DRAWN = 2;
export const FOW_HAND_MAX = 4;

// ── Conscript Levies ─────────────────────────────────────────────────────────
export const LEVY_GROUP_SIZE = 3;

// ── Kingdom Advantage ────────────────────────────────────────────────────────
export const ELITE_REGIMENTS_COUNT = 3;

// ── Recruit Regiments ────────────────────────────────────────────────────────
export const RECRUIT_REGIMENTS_REWARD = 4;

// ── Resolution / scoring ─────────────────────────────────────────────────────
export const FINAL_ROUND_GOLD_PER_VP = 5;
export const DEBT_PENALTY_DIVISOR = 2;
export const TRADE_VP_SCHEDULE: Record<number, [number, number, number]> = {
  1: [3, 2, 1],
  2: [6, 4, 2],
  4: [9, 6, 3],
  6: [12, 8, 4],
};

export const CounsellorSlot = {
  First:  1,
  Second: 2,
  Third:  3,
} as const;

// ── Action board slot counts ───────────────────────────────────────────────
export const SLOTS_RECRUIT_COUNSELLORS = 3;
export const SLOTS_RECRUIT_REGIMENTS = 6;
export const SLOTS_PURCHASE_SKYSHIPS = 2;
export const SLOTS_FOUND_FACTORIES = 4;
export const SLOTS_FOUND_BUILDINGS = 4;
export const SLOTS_PUNISH_DISSENTERS = 6;
export const SLOTS_CONVERT_MONARCH = 6;

export const BuildingSlot = {
  Cathedral: 1,
  Palace:    2,
  Shipyard:  3,
  Fort:      4,
} as const;

export const BUILDING_BASE_COST = {
  cathedral: 5,
  palace: 5,
  shipyard: 3,
  fort: 2,
} as const;

export const STARTING_RESOURCES = {
  gold: 6,
  victoryPoints: 10,
  counsellors: 4,
  skyships: 3,
  regiments: 6,
  levies: 0,
  factories: 1,
} as const;

export const ALL_KA_CARDS: KingdomAdvantageCard[] = [
  "elite_regiments",
  "improved_training",
  "licenced_smugglers",
  "more_efficient_taxation",
  "more_prisons",
  "patriarch_of_the_church",
  "sanctioned_piracy",
];

export const LEGACY_CARDS: LegacyCardInfo[] = [
  { name: "the builder",     colour: "purple" },
  { name: "the conqueror",   colour: "purple" },
  { name: "the navigator",   colour: "purple" },
  { name: "the great",       colour: "purple" },
  { name: "the magnificent", colour: "orange" },
  { name: "the merchant",    colour: "purple" },
  { name: "the mighty",      colour: "purple" },
  { name: "the aviator",     colour: "purple" },
  { name: "the pious",       colour: "purple" },
  { name: "the builder",     colour: "orange" },
  { name: "the conqueror",   colour: "orange" },
  { name: "the navigator",   colour: "orange" },
  { name: "the great",       colour: "orange" },
  { name: "the magnificent", colour: "orange" },
  { name: "the merchant",    colour: "orange" },
  { name: "the mighty",      colour: "orange" },
  { name: "the aviator",     colour: "orange" },
  { name: "the pious",       colour: "purple" },
];

export const GAME_PHASES: { key: string; label: string }[] = [
  { key: "legacy_card",     label: "Legacy Card" },
  { key: "events",          label: "Events" },
  { key: "discovery",       label: "Discovery" },
  { key: "taxes",           label: "Taxes" },
  { key: "actions",         label: "Actions" },
  { key: "battle",          label: "Battle" },
  { key: "plunder_legends", label: "Plunder Legends" },
  { key: "conquest",        label: "Conquest" },
  { key: "election",        label: "Election" },
  { key: "resolution",      label: "Resolution" },
];

export const colourToKingdomMap: Record<string, KingdomName> = {
  "#DC5454": "Angland",
  "#51658D": "Gallois",
  "#F5DE48": "Castillia",
  // "#FE9F10":"Zeeland",
  // "#FE9ACC":"Venoa",
  "#A0522D": "Nordmark",
  "#E6EFE9": "Ostreich",
  "#478779": "Constantium",
};

// ── Fortune of War cards ─────────────────────────────────────────────────────
// Config-driven: change count to adjust deck size, adjust sword/shield values
export const FOW_CARD_CONFIG: { sword: number; shield: number; count: number }[] = [
  { sword: 1, shield: 0, count: 3 },
  { sword: 2, shield: 0, count: 3 },
  { sword: 3, shield: 0, count: 3 },
  { sword: 4, shield: 0, count: 3 },
  { sword: 5, shield: 0, count: 3 },
  { sword: 0, shield: 4, count: 3 },
  { sword: 0, shield: 5, count: 3 },
  { sword: 0, shield: 6, count: 3 },
  { sword: 0, shield: 7, count: 3 },
  { sword: 0, shield: 8, count: 3 },
  { sword: 0, shield: 0, count: 2 }, // No Effect
];

export const fortuneOfWarCards: FortuneOfWarCardInfo[] =
  FOW_CARD_CONFIG.flatMap(({ sword, shield, count }) => {
    const label = sword > 0 ? `Sword${sword}` : shield > 0 ? `Shield${shield}` : "NoEffect";
    return Array.from({ length: count }, (_, i) => ({
      name: `${label}_${i + 1}`,
      sword,
      shield,
    }));
  });
