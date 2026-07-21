/**
 * Gold costs of action-board placements — the single source of truth,
 * shared by the move implementations and the client UI (affordability
 * shading). Costs here are what the NEXT placement will charge.
 */
import { MyGameState, PlayerColour } from "../types.js";
import { BUILDING_BASE_COST, BuildingSlot } from "../data/gameData.js";

export type SlottedActionKey =
  | "recruitCounsellors"
  | "recruitRegiments"
  | "purchaseSkyshipsZeeland"
  | "purchaseSkyshipsVenoa"
  | "foundFactories";

const SLOT_BASE_COST: Record<SlottedActionKey, number> = {
  recruitCounsellors: 1,
  recruitRegiments: 2,
  purchaseSkyshipsZeeland: 3,
  purchaseSkyshipsVenoa: 3,
  foundFactories: 2,
};

/** Gold cost of the next counsellor placed on a stacking action row. */
export const getNextSlotCost = (G: MyGameState, key: SlottedActionKey): number =>
  SLOT_BASE_COST[key] + G.boardState[key].length;

type BuildingSlotValue = (typeof BuildingSlot)[keyof typeof BuildingSlot];

const BUILDING_KEY_BY_SLOT: Record<BuildingSlotValue, keyof typeof BUILDING_BASE_COST> = {
  [BuildingSlot.Cathedral]: "cathedral",
  [BuildingSlot.Palace]: "palace",
  [BuildingSlot.Shipyard]: "shipyard",
  [BuildingSlot.Fort]: "fort",
};

/** Gold cost of the next counsellor placed on a building cell. */
export const getNextBuildingCost = (G: MyGameState, slot: BuildingSlotValue): number =>
  BUILDING_BASE_COST[BUILDING_KEY_BY_SLOT[slot]] +
  G.boardState.foundBuildings[slot].length +
  1;

export const CONVERT_MONARCH_GOLD_COST = 2;

/**
 * Cost of influencing a Prelate slot (1-8), and who gets paid:
 * free on your own kingdom's slot; 1 gold for NPRs and absent kingdoms;
 * the owner's cathedral count (paid to them) for a rival's slot.
 */
export const getInfluencePrelateCost = (
  G: MyGameState,
  playerID: string,
  slotValue: number
): { cost: number; recipientID: string | null } => {
  const slotColourMap: Record<number, string | null> = {
    1: PlayerColour.red,
    2: PlayerColour.blue,
    3: PlayerColour.yellow,
    4: null,
    5: null,
    6: PlayerColour.brown,
    7: PlayerColour.white,
    8: PlayerColour.green,
  };
  const slotColour = slotColourMap[slotValue];

  if (slotColour !== null && slotColour === G.playerInfo[playerID].colour) {
    return { cost: 0, recipientID: null };
  }

  let cost = 1;
  let recipientID: string | null = null;
  for (const [id, info] of Object.entries(G.playerInfo)) {
    if (info.colour === slotColour) {
      recipientID = id;
      cost = info.cathedrals;
    }
  }
  return { cost, recipientID };
};
