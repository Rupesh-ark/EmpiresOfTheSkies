// ── Map Tile images ──────────────────────────────────────────────────────────

import KnownWorld1 from "../map_tiles/known_world1.svg";
import KnownWorld2 from "../map_tiles/known_world2.svg";
import KnownWorld3 from "../map_tiles/known_world3.svg";
import KnownWorld4 from "../map_tiles/known_world4.svg";

import Dwarves1 from "../map_tiles/unknown_world_tiles/dwarves1.svg";
import Dwarves2 from "../map_tiles/unknown_world_tiles/dwarves2.svg";
import Dwarves3 from "../map_tiles/unknown_world_tiles/dwarves3.svg";
import Elves1 from "../map_tiles/unknown_world_tiles/elves1.svg";
import Elves2 from "../map_tiles/unknown_world_tiles/elves2.svg";
import Elves3 from "../map_tiles/unknown_world_tiles/elves3.svg";
import Goblins1 from "../map_tiles/unknown_world_tiles/goblins1.svg";
import Goblins2 from "../map_tiles/unknown_world_tiles/goblins2.svg";
import Goblins3 from "../map_tiles/unknown_world_tiles/goblins3.svg";
import Halflings1 from "../map_tiles/unknown_world_tiles/halflings1.svg";
import Halflings2 from "../map_tiles/unknown_world_tiles/halflings2.svg";
import Halflings3 from "../map_tiles/unknown_world_tiles/halflings3.svg";
import Orcs1 from "../map_tiles/unknown_world_tiles/orcs1.svg";
import Orcs2 from "../map_tiles/unknown_world_tiles/orcs2.svg";
import Orcs3 from "../map_tiles/unknown_world_tiles/orcs3.svg";
import Trolls1 from "../map_tiles/unknown_world_tiles/trolls1.svg";
import Trolls2 from "../map_tiles/unknown_world_tiles/trolls2.svg";
import Trolls3 from "../map_tiles/unknown_world_tiles/trolls3.svg";
import Ocean from "../map_tiles/unknown_world_tiles/ocean.svg";

import HereBeDragons from "../map_tiles/unknown_world_tiles/here_be_dragons.svg";
import SeaElves from "../map_tiles/unknown_world_tiles/sea_elves.svg";
import TheFountainOfYouth from "../map_tiles/unknown_world_tiles/the_fountain_of_youth.svg";
import TheKingdomOfTheMerfolk from "../map_tiles/unknown_world_tiles/the_kingdom_of_the_merfolk.svg";
import TheKraken from "../map_tiles/unknown_world_tiles/the_kraken.svg";
import TheLostCityOfGold from "../map_tiles/unknown_world_tiles/the_lost_city_of_gold.svg";

export const KNOWN_WORLD = [KnownWorld1, KnownWorld2, KnownWorld3, KnownWorld4];

export const UNKNOWN_WORLD: Record<string, string> = {
  Dwarves1, Dwarves2, Dwarves3,
  Elves1, Elves2, Elves3,
  Goblins1, Goblins2, Goblins3,
  Halflings1, Halflings2, Halflings3,
  Orcs1, Orcs2, Orcs3,
  Trolls1, Trolls2, Trolls3,
  Ocean1: Ocean, Ocean2: Ocean, Ocean3: Ocean, Ocean4: Ocean,
};

export const LEGEND_TILES: Record<string, string> = {
  HereBeDragons,
  SeaElves,
  TheFountainOfYouth,
  TheKingdomOfTheMerfolk,
  TheKraken,
  TheLostCityOfGold,
};
