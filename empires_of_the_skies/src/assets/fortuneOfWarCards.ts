// ── Fortune of War card images ───────────────────────────────────────────────

import swordOne from "../boards_and_assets/cards/fortunes_of_war_cards/1_sword.svg";
import swordTwo from "../boards_and_assets/cards/fortunes_of_war_cards/2_sword.svg";
import swordThree from "../boards_and_assets/cards/fortunes_of_war_cards/3_sword.svg";
import swordFour from "../boards_and_assets/cards/fortunes_of_war_cards/4_sword.svg";
import swordFive from "../boards_and_assets/cards/fortunes_of_war_cards/5_sword.svg";
import shieldFour from "../boards_and_assets/cards/fortunes_of_war_cards/4_shield.svg";
import shieldFive from "../boards_and_assets/cards/fortunes_of_war_cards/5_shield.svg";
import shieldSix from "../boards_and_assets/cards/fortunes_of_war_cards/6_shield.svg";
import shieldSeven from "../boards_and_assets/cards/fortunes_of_war_cards/7_shield.svg";
import shieldEight from "../boards_and_assets/cards/fortunes_of_war_cards/8_shield.svg";
import noEffect from "../boards_and_assets/cards/fortunes_of_war_cards/no_effect.svg";
import cardBack from "../boards_and_assets/cards/fortunes_of_war_card_back.svg";

export const SWORD_CARDS: Record<number, string> = {
  1: swordOne,
  2: swordTwo,
  3: swordThree,
  4: swordFour,
  5: swordFive,
};

export const SHIELD_CARDS: Record<number, string> = {
  4: shieldFour,
  5: shieldFive,
  6: shieldSix,
  7: shieldSeven,
  8: shieldEight,
};

export const NO_EFFECT_CARD = noEffect;
export const FOW_CARD_BACK = cardBack;
