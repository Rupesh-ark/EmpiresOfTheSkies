import { KingdomAdvantageCard } from "../types";

export type KACardDef = {
  displayName: string;
  description: string;
  imageKey: string;
};

export const KA_CARD_DEFS: Record<KingdomAdvantageCard, KACardDef> = {
  elite_regiments: {
    displayName: "Elite Regiments",
    description:
      "Replace 3 Regiments with 3 Elite Regiments — purple cubes worth 3 Swords each. Once lost in battle, they cannot be re-recruited.",
    imageKey: "elite_regiments",
  },
  improved_training: {
    displayName: "Improved Training",
    description:
      "Each Fortune of War card played from hand gains +1 Sword or +1 Shield.",
    imageKey: "improved_training",
  },
  licenced_smugglers: {
    displayName: "Licenced Smugglers",
    description:
      "Receive 1 extra Goods cube of your choice during each Run Trade Routes stage.",
    imageKey: "licenced_smugglers",
  },
  more_efficient_taxation: {
    displayName: "More Efficient Taxation",
    description: "Collect 2 additional Gold during each Taxes phase.",
    imageKey: "more_efficient_taxation",
  },
  more_prisons: {
    displayName: "More Prisons",
    description:
      "Your Prison holds 4 Dissenters instead of 3. You may imprison or execute up to 4 per Round.",
    imageKey: "more_prisons",
  },
  patriarch_of_the_church: {
    displayName: "Patriarch of the Church",
    description:
      "Gain 1 extra Vote in every Archprelate Election. This card cannot be bought by another player.",
    imageKey: "patriarch_of_the_church",
  },
  sanctioned_piracy: {
    displayName: "Sanctioned Piracy",
    description:
      "Earn +1 VP for each Trade Route subject to Piracy by your Fleets, in addition to the Gold collected.",
    imageKey: "sanctioned_piracy",
  },
};
