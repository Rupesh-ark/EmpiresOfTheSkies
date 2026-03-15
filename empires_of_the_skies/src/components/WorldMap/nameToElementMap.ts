import { KNOWN_WORLD, UNKNOWN_WORLD, LEGEND_TILES } from "@/assets/mapTiles";
import { SWORD_CARDS, SHIELD_CARDS, NO_EFFECT_CARD } from "@/assets/fortuneOfWarCards";
import { LEGACY_CARD_IMAGES } from "@/assets/legacyCards";

const svgNameToElementMap: Record<string, string> = {
  // Known world tiles
  KnownWorld1: KNOWN_WORLD[0],
  KnownWorld2: KNOWN_WORLD[1],
  KnownWorld3: KNOWN_WORLD[2],
  KnownWorld4: KNOWN_WORLD[3],

  // Unknown world tiles (races + oceans)
  ...UNKNOWN_WORLD,

  // Legend tiles
  ...LEGEND_TILES,

  // Fortune of War cards
  SwordOne: SWORD_CARDS[1],
  SwordTwo: SWORD_CARDS[2],
  SwordThree: SWORD_CARDS[3],
  SwordFour: SWORD_CARDS[4],
  SwordFive: SWORD_CARDS[5],
  ShieldFour: SHIELD_CARDS[4],
  ShieldFive: SHIELD_CARDS[5],
  ShieldSix: SHIELD_CARDS[6],
  ShieldSeven: SHIELD_CARDS[7],
  ShieldEight: SHIELD_CARDS[8],
  noEffect: NO_EFFECT_CARD,

  // Legacy cards
  ...LEGACY_CARD_IMAGES,
};

export default svgNameToElementMap;
