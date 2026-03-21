// ── Action Board images ──────────────────────────────────────────────────────
// Grouped by section. Import from here instead of deep relative paths.

import playerOrderTile from "../boards_and_assets/tiles/player_order_tile.svg";

import recruitCounsellor1 from "../boards_and_assets/action_board/recruit_counsillor1.svg";
import recruitCounsellor2 from "../boards_and_assets/action_board/recruit_counsillor2.svg";
import recruitCounsellor3 from "../boards_and_assets/action_board/recruit_counsillor3.svg";

import recruitRegiments1 from "../boards_and_assets/action_board/recruit_regiments1.svg";
import recruitRegiments2 from "../boards_and_assets/action_board/recruit_regiments2.svg";
import recruitRegiments3 from "../boards_and_assets/action_board/recruit_regiments3.svg";
import recruitRegiments4 from "../boards_and_assets/action_board/recruit_regiments4.svg";
import recruitRegiments5 from "../boards_and_assets/action_board/recruit_regiments5.svg";
import recruitRegiments6 from "../boards_and_assets/action_board/recruit_regiments6.svg";

import purchaseSkyshipsZeeland1 from "../boards_and_assets/action_board/build_skyships_zeeland1.svg";
import purchaseSkyshipsZeeland2 from "../boards_and_assets/action_board/build_skyships_zeeland2.svg";
import purchaseSkyshipsVenoa1 from "../boards_and_assets/action_board/build_skyships_venoa1.svg";
import purchaseSkyshipsVenoa2 from "../boards_and_assets/action_board/build_skyships_venoa2.svg";

import buildCathedral from "../boards_and_assets/action_board/build_cathedral.svg";
import buildPalace from "../boards_and_assets/action_board/build_palace.svg";
import buildShipyard from "../boards_and_assets/action_board/build_shipyards.svg";
import buildForts from "../boards_and_assets/action_board/build_forts.svg";

import punishDissenters1 from "../boards_and_assets/action_board/punish_dissenters1.svg";
import punishDissenters2 from "../boards_and_assets/action_board/punish_dissenters2.svg";
import punishDissenters3 from "../boards_and_assets/action_board/punish_dissenters3.svg";
import punishDissenters4 from "../boards_and_assets/action_board/punish_dissenters4.svg";
import punishDissenters5 from "../boards_and_assets/action_board/punish_dissenters5.svg";
import punishDissenters6 from "../boards_and_assets/action_board/punish_dissenters6.svg";

import convertMonarch1 from "../boards_and_assets/action_board/convert_monarch1.svg";
import convertMonarch2 from "../boards_and_assets/action_board/convert_monarch2.svg";
import convertMonarch3 from "../boards_and_assets/action_board/convert_monarch3.svg";
import convertMonarch4 from "../boards_and_assets/action_board/convert_monarch4.svg";
import convertMonarch5 from "../boards_and_assets/action_board/convert_monarch5.svg";
import convertMonarch6 from "../boards_and_assets/action_board/convert_monarch6.svg";

import issueHolyDecree from "../boards_and_assets/action_board/issue_holy_decree.svg";

export const PLAYER_ORDER = Array(6).fill(playerOrderTile);

export const RECRUIT_COUNSELLORS = [
  recruitCounsellor1,
  recruitCounsellor2,
  recruitCounsellor3,
];

export const RECRUIT_REGIMENTS = [
  recruitRegiments1,
  recruitRegiments2,
  recruitRegiments3,
  recruitRegiments4,
  recruitRegiments5,
  recruitRegiments6,
];

export const PURCHASE_SKYSHIPS_ZEELAND = [
  purchaseSkyshipsZeeland1,
  purchaseSkyshipsZeeland2,
];

export const PURCHASE_SKYSHIPS_VENOA = [
  purchaseSkyshipsVenoa1,
  purchaseSkyshipsVenoa2,
];

export const FOUND_BUILDINGS = [
  buildCathedral,
  buildPalace,
  buildShipyard,
  buildForts,
];

export const PUNISH_DISSENTERS = [
  punishDissenters1,
  punishDissenters2,
  punishDissenters3,
  punishDissenters4,
  punishDissenters5,
  punishDissenters6,
];

export const CONVERT_MONARCH = [
  convertMonarch1,
  convertMonarch2,
  convertMonarch3,
  convertMonarch4,
  convertMonarch5,
  convertMonarch6,
];

export const ISSUE_HOLY_DECREE = issueHolyDecree;

// ── Button background illustrations (manuscript line drawings) ──────────

import recruitCounsellorsBg from "../boards_and_assets/action_board/recruit_counsellors_btnBg.png";
import recruitRegimentsBg from "../boards_and_assets/action_board/recruit_regiments_btnBg.png";
import purchaseSkyshipsZeelandBg from "../boards_and_assets/action_board/purchase_skyships_zeeland_btnBg.png";
import purchaseSkyshipsVenoaBg from "../boards_and_assets/action_board/purchase_skyships_venoa_btnBg.png";
import foundFactoryBg from "../boards_and_assets/action_board/found_factory_btnBg.png";
import punishDissentersBg from "../boards_and_assets/action_board/punish_dissenters_btnBg.png";
import convertMonarchBg from "../boards_and_assets/action_board/convert_monarch_btnBg.png";
import changePlayerOrderBg from "../boards_and_assets/action_board/change_player_order_btnBg.png";
import cathedralBg from "../boards_and_assets/action_board/cathedral_btnBg.png";
import palaceBg from "../boards_and_assets/action_board/palace_btnBg.png";
import shipyardBg from "../boards_and_assets/action_board/shipyard_btnBg.png";
import fortBg from "../boards_and_assets/action_board/fort_btnBg.png";
import influencePrelatesBg from "../boards_and_assets/action_board/influence_prelates_btnBg.png";
import holyDecreeBg from "../boards_and_assets/action_board/holy_decree_btnBg.png";

export const BTN_BG = {
  recruitCounsellors: recruitCounsellorsBg,
  recruitRegiments: recruitRegimentsBg,
  purchaseSkyshipsZeeland: purchaseSkyshipsZeelandBg,
  purchaseSkyshipsVenoa: purchaseSkyshipsVenoaBg,
  foundFactory: foundFactoryBg,
  punishDissenters: punishDissentersBg,
  convertMonarch: convertMonarchBg,
  changePlayerOrder: changePlayerOrderBg,
  cathedral: cathedralBg,
  palace: palaceBg,
  shipyard: shipyardBg,
  fort: fortBg,
  influencePrelates: influencePrelatesBg,
  holyDecree: holyDecreeBg,
} as const;
