import { LegacyCardName } from "../types";

export type LegacyCardDef = {
  displayName: string;
  description: string;
  imageKey: string;
};

export const LEGACY_CARD_DEFS: Record<LegacyCardName, LegacyCardDef> = {
  "the aviator": {
    displayName: "The Aviator",
    description: "+1 VP per Skyship in your Kingdom and Fleets.",
    imageKey: "the_aviator",
  },
  "the builder": {
    displayName: "The Builder",
    description: "+2 VP per Cathedral, Palace, Shipyard, and Fort you own.",
    imageKey: "the_builder",
  },
  "the conqueror": {
    displayName: "The Conqueror",
    description: "+6 VP per Colony you own.",
    imageKey: "the_conqueror",
  },
  "the great": {
    displayName: "The Great",
    description:
      "+4 VP for each category where you have the most or are tied for most: Skyships, Regiments, Palaces, Cathedrals, Outposts, Colonies, Forts, Trade Goods.",
    imageKey: "the_great",
  },
  "the magnificent": {
    displayName: "The Magnificent",
    description: "+4 VP per Palace you own.",
    imageKey: "the_magnificent",
  },
  "the merchant": {
    displayName: "The Merchant",
    description: "+1 VP per Trade Gain in your active Trade Routes.",
    imageKey: "the_merchant",
  },
  "the mighty": {
    displayName: "The Mighty",
    description:
      "+1 VP per Skyship in your Fleets, +1 VP per Fort, and +1 VP per 3 Regiments.",
    imageKey: "the_mighty",
  },
  "the navigator": {
    displayName: "The Navigator",
    description: "+4 VP per Outpost and Colony you own.",
    imageKey: "the_navigator",
  },
  "the pious": {
    displayName: "The Pious",
    description: "+4 VP per Cathedral you own.",
    imageKey: "the_pious",
  },
};
