import { FortuneOfWarCardInfo, KingdomAdvantageCard, KingdomName, LegacyCardInfo, TileInfoProps } from "./types";

// ── Game configuration ────────────────────────────────────────────────────────

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 1;
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
  { name: "the magnificent", colour: "purple" },
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
  { name: "the pious",       colour: "orange" },
];

export const GAME_PHASES: { key: string; label: string }[] = [
  { key: "legacy_card",     label: "Legacy Card" },
  { key: "discovery",       label: "Discovery" },
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

export const unknownWorldTiles: TileInfoProps[] = [
  {
    name: "Dwarves1",
    blocked: ["N", "NE", "NW"],
    sword: 10,
    shield: 11,
    type: "land",
    loot: {
      outpost: {
        gold: 2,
        mithril: 1,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 3,
        mithril: 1,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Dwarves2",
    blocked: ["E", "SE"],
    sword: 8,
    shield: 9,
    type: "land",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 1,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Dwarves3",
    blocked: ["E"],
    sword: 10,
    shield: 11,
    type: "land",
    loot: {
      outpost: {
        gold: 1,
        mithril: 1,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 2,
        mithril: 1,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Elves1",
    blocked: ["NW"],
    sword: 17,
    shield: 8,
    type: "land",
    loot: {
      outpost: {
        gold: 2,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 1,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 3,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 1,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Elves2",
    blocked: [],
    sword: 14,
    shield: 7,
    type: "land",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 1,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 2,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 1,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Elves3",
    blocked: [],
    sword: 11,
    shield: 6,
    type: "land",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 1,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Goblins1",
    blocked: [],
    sword: 10,
    shield: 7,
    type: "land",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 3,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 2,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 2,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Goblins2",
    blocked: ["NE"],
    sword: 8,
    shield: 5,
    type: "land",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 2,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 2,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Goblins3",
    blocked: ["W"],
    sword: 6,
    shield: 3,
    type: "land",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 1,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 1,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Halflings1",
    blocked: [],
    sword: 7,
    shield: 10,
    type: "land",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 3,
        victoryPoints: 0,
      },
      colony: {
        gold: 2,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 2,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Halflings2",
    blocked: [],
    sword: 5,
    shield: 8,
    type: "land",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 2,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 2,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Halflings3",
    blocked: [],
    sword: 3,
    shield: 6,
    type: "land",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 1,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 1,
        victoryPoints: 0,
      },
    },
  },

  {
    name: "Orcs1",
    blocked: ["NE"],
    sword: 16,
    shield: 5,
    type: "land",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 2,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 2,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 2,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Orcs2",
    blocked: ["NW"],
    sword: 10,
    shield: 3,
    type: "land",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 1,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 1,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Orcs3",
    blocked: [],
    sword: 13,
    shield: 4,
    type: "land",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 1,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 2,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Trolls1",
    blocked: ["W"],
    sword: 11,
    shield: 10,
    type: "land",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 2,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 2,
        mithril: 0,
        dragonScales: 2,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Trolls2",
    blocked: ["SW"],
    sword: 9,
    shield: 8,
    type: "land",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 1,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 2,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Trolls3",
    blocked: ["NE"],
    sword: 6,
    type: "land",
    shield: 3,
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 1,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 1,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
];
export const oceanTiles: TileInfoProps[] = [
  {
    name: "Ocean1",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "ocean",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Ocean2",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "ocean",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Ocean3",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "ocean",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "Ocean4",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "ocean",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
];
export const legendTiles: TileInfoProps[] = [
  {
    name: "HereBeDragons",
    blocked: ["S", "SE"],
    sword: 0,
    shield: 0,
    type: "legend",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 1,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 1,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "SeaElves",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "legend",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 1,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 1,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "TheFountainOfYouth",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "legend",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 2,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 2,
      },
    },
  },
  {
    name: "TheKingdomOfTheMerfolk",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "legend",
    loot: {
      outpost: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 1,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 1,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "TheKraken",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "legend",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 2,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 2,
      },
    },
  },
  {
    name: "TheLostCityOfGold",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "legend",
    loot: {
      outpost: {
        gold: 1,
        mithril: 1,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 1,
        mithril: 1,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
];

export const knownWorldTiles: TileInfoProps[] = [
  {
    name: "KnownWorld1",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "ocean",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "KnownWorld2",
    blocked: ["E", "SE"],
    sword: 0,
    shield: 0,
    type: "home",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "KnownWorld3",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "ocean",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
  {
    name: "KnownWorld4",
    blocked: [],
    sword: 0,
    shield: 0,
    type: "infidel_empire",
    loot: {
      outpost: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
      colony: {
        gold: 0,
        mithril: 0,
        dragonScales: 0,
        krakenSkin: 0,
        magicDust: 0,
        stickyIchor: 0,
        pipeweed: 0,
        victoryPoints: 0,
      },
    },
  },
];

export const fortuneOfWarCards: FortuneOfWarCardInfo[] = [
  { name: "SwordOne_1", sword: 1, shield: 0 },
  { name: "SwordOne_2", sword: 1, shield: 0 },
  { name: "SwordOne_3", sword: 1, shield: 0 },
  { name: "SwordTwo_1", sword: 2, shield: 0 },
  { name: "SwordTwo_2", sword: 2, shield: 0 },
  { name: "SwordTwo_3", sword: 2, shield: 0 },
  { name: "SwordThree_1", sword: 3, shield: 0 },
  { name: "SwordThree_2", sword: 3, shield: 0 },
  { name: "SwordThree_3", sword: 3, shield: 0 },
  { name: "SwordFour_1", sword: 4, shield: 0 },
  { name: "SwordFour_2", sword: 4, shield: 0 },
  { name: "SwordFour_3", sword: 4, shield: 0 },
  { name: "SwordFive_1", sword: 5, shield: 0 },
  { name: "SwordFive_2", sword: 5, shield: 0 },
  { name: "SwordFive_3", sword: 5, shield: 0 },
  { name: "ShieldOne_1", sword: 0, shield: 1 },
  { name: "ShieldOne_2", sword: 0, shield: 1 },
  { name: "ShieldOne_3", sword: 0, shield: 1 },
  { name: "ShieldTwo_1", sword: 0, shield: 2 },
  { name: "ShieldTwo_2", sword: 0, shield: 2 },
  { name: "ShieldTwo_3", sword: 0, shield: 2 },
  { name: "ShieldThree_1", sword: 0, shield: 3 },
  { name: "ShieldThree_2", sword: 0, shield: 3 },
  { name: "ShieldThree_3", sword: 0, shield: 3 },
  { name: "ShieldFour_1", sword: 0, shield: 4 },
  { name: "ShieldFour_2", sword: 0, shield: 4 },
  { name: "ShieldFour_3", sword: 0, shield: 4 },
  { name: "ShieldFive_1", sword: 0, shield: 5 },
  { name: "ShieldFive_2", sword: 0, shield: 5 },
  { name: "ShieldFive_3", sword: 0, shield: 5 },
  { name: "NoEffect_1", sword: 0, shield: 0 },
  { name: "NoEffect_2", sword: 0, shield: 0 },
];
