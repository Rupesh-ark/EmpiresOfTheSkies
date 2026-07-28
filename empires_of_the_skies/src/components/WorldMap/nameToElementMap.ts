import { KNOWN_WORLD, UNKNOWN_WORLD, LEGEND_TILES } from "@/assets/mapTiles";
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

  // Legacy cards
  ...LEGACY_CARD_IMAGES,
};

export default svgNameToElementMap;
