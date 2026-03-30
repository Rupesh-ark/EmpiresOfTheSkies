import KnownWorldTile1 from "../../map_tiles/known_world1.svg";
import KnownWorldTile2 from "../../map_tiles/known_world2.svg";
import KnownWorldTile3 from "../../map_tiles/known_world3.svg";
import KnownWorldTile4 from "../../map_tiles/known_world4.svg";
import Dwarves1 from "../../map_tiles/unknown_world_tiles/dwarves1.svg";
import Dwarves2 from "../../map_tiles/unknown_world_tiles/dwarves2.svg";
import Dwarves3 from "../../map_tiles/unknown_world_tiles/dwarves3.svg";
import Elves1 from "../../map_tiles/unknown_world_tiles/elves1.svg";
import Elves2 from "../../map_tiles/unknown_world_tiles/elves2.svg";
import Elves3 from "../../map_tiles/unknown_world_tiles/elves3.svg";
import Goblins1 from "../../map_tiles/unknown_world_tiles/goblins1.svg";
import Goblins2 from "../../map_tiles/unknown_world_tiles/goblins2.svg";
import Goblins3 from "../../map_tiles/unknown_world_tiles/goblins3.svg";
import Halflings1 from "../../map_tiles/unknown_world_tiles/halflings1.svg";
import Halflings2 from "../../map_tiles/unknown_world_tiles/halflings2.svg";
import Halflings3 from "../../map_tiles/unknown_world_tiles/halflings3.svg";
import HereBeDragons from "../../map_tiles/unknown_world_tiles/here_be_dragons.svg";
import Ocean1 from "../../map_tiles/unknown_world_tiles/ocean.svg";
import Ocean2 from "../../map_tiles/unknown_world_tiles/ocean.svg";
import Ocean3 from "../../map_tiles/unknown_world_tiles/ocean.svg";
import Ocean4 from "../../map_tiles/unknown_world_tiles/ocean.svg";
import Orcs1 from "../../map_tiles/unknown_world_tiles/orcs1.svg";
import Orcs2 from "../../map_tiles/unknown_world_tiles/orcs2.svg";
import Orcs3 from "../../map_tiles/unknown_world_tiles/orcs3.svg";
import SeaElves from "../../map_tiles/unknown_world_tiles/sea_elves.svg";
import TheFountainOfYouth from "../../map_tiles/unknown_world_tiles/the_fountain_of_youth.svg";
import TheKingdomOfTheMerfolk from "../../map_tiles/unknown_world_tiles/the_kingdom_of_the_merfolk.svg";
import TheKraken from "../../map_tiles/unknown_world_tiles/the_kraken.svg";
import TheLostCityOfGold from "../../map_tiles/unknown_world_tiles/the_lost_city_of_gold.svg";
import Trolls1 from "../../map_tiles/unknown_world_tiles/trolls1.svg";
import Trolls2 from "../../map_tiles/unknown_world_tiles/trolls2.svg";
import Trolls3 from "../../map_tiles/unknown_world_tiles/trolls3.svg";
import swordOne from "../../boards_and_assets/fortunes_of_war_cards/1_sword.svg";
import swordTwo from "../../boards_and_assets/fortunes_of_war_cards/2_sword.svg";
import swordThree from "../../boards_and_assets/fortunes_of_war_cards/3_sword.svg";
import swordFour from "../../boards_and_assets/fortunes_of_war_cards/4_sword.svg";
import swordFive from "../../boards_and_assets/fortunes_of_war_cards/5_sword.svg";
import shieldFour from "../../boards_and_assets/fortunes_of_war_cards/4_shield.svg";
import shieldFive from "../../boards_and_assets/fortunes_of_war_cards/5_shield.svg";
import shieldSix from "../../boards_and_assets/fortunes_of_war_cards/6_shield.svg";
import shieldSeven from "../../boards_and_assets/fortunes_of_war_cards/7_shield.svg";
import shieldEight from "../../boards_and_assets/fortunes_of_war_cards/8_shield.svg";
import noEffect from "../../boards_and_assets/fortunes_of_war_cards/no_effect.svg";
import theBuilder from "../../boards_and_assets/legacy_cards/the_builder.svg";
import theNavigator from "../../boards_and_assets/legacy_cards/the_navigator.svg";
import theConqueror from "../../boards_and_assets/legacy_cards/the_conqueror.svg";
import theExplorer from "../../boards_and_assets/legacy_cards/the_explorer.svg";
import theGreat from "../../boards_and_assets/legacy_cards/the_great.svg";
import theMagnificent from "../../boards_and_assets/legacy_cards/the_magnificent.svg";
import theMerchant from "../../boards_and_assets/legacy_cards/the_merchant.svg";
import theMighty from "../../boards_and_assets/legacy_cards/the_mighty.svg";
import thePious from "../../boards_and_assets/legacy_cards/the_pious.svg";

const svgNameToElementMap: Record<string, string> = {
  KnownWorld1: KnownWorldTile1,
  KnownWorld2: KnownWorldTile2,
  KnownWorld3: KnownWorldTile3,
  KnownWorld4: KnownWorldTile4,
  Dwarves1: Dwarves1,
  Dwarves2: Dwarves2,
  Dwarves3: Dwarves3,
  Elves1: Elves1,
  Elves2: Elves2,
  Elves3: Elves3,
  Goblins1: Goblins1,
  Goblins2: Goblins2,
  Goblins3: Goblins3,
  Halflings1: Halflings1,
  Halflings2: Halflings2,
  Halflings3: Halflings3,
  HereBeDragons: HereBeDragons,
  Ocean1: Ocean1,
  Ocean2: Ocean2,
  Ocean3: Ocean3,
  Ocean4: Ocean4,
  Orcs1: Orcs1,
  Orcs2: Orcs2,
  Orcs3: Orcs3,
  SeaElves: SeaElves,
  TheFountainOfYouth: TheFountainOfYouth,
  TheKingdomOfTheMerfolk: TheKingdomOfTheMerfolk,
  TheKraken: TheKraken,
  TheLostCityOfGold: TheLostCityOfGold,
  Trolls1: Trolls1,
  Trolls2: Trolls2,
  Trolls3: Trolls3,
  SwordOne: swordOne,
  SwordTwo: swordTwo,
  SwordThree: swordThree,
  SwordFour: swordFour,
  SwordFive: swordFive,
  ShieldFour: shieldFour,
  ShieldFive: shieldFive,
  ShieldSix: shieldSix,
  ShieldSeven: shieldSeven,
  ShieldEight: shieldEight,
  noEffect: noEffect,
  "the builder": theBuilder,
  "the navigator": theNavigator,
  "the conqueror": theConqueror,
  "the explorer": theExplorer,
  "the great": theGreat,
  "the magnificent": theMagnificent,
  "the merchant": theMerchant,
  "the mighty": theMighty,
  "the pious": thePious,
};

export default svgNameToElementMap;
