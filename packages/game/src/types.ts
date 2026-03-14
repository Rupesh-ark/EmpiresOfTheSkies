import { BoardProps } from "boardgame.io/dist/types/packages/react";

export interface MyGameProps extends BoardProps<MyGameState> {}

export type DealOffer = {
  gold?: number;
  skyships?: number;
  outposts?: [number, number][];
  archprelateToken?: boolean;
};

export type DealProposal = {
  proposerID: string;
  targetID: string;
  offering: DealOffer;
  requesting: DealOffer;
};

export interface MyGameState {
  playerInfo: { [details: string]: PlayerInfo };
  mapState: MapState;
  boardState: ActionBoardInfo;
  cardDecks: CardDeckInfo;
  battleState?: BattleState;
  conquestState?: BattlePlayerInfo;
  pendingDeal?: DealProposal;
  stage:
    | "discovery"
    | "actions"
    | "attack or pass"
    | "attack or evade"
    | "resolve battle"
    | "plunder legends"
    | "relocate loser"
    | "ground battle"
    | "conquest"
    | "conquest draw or pick card"
    | "election"
    | "defend or yield"
    | "resolve ground battle"
    | "garrison troops"
    | "retrieve fleets"
    | "pick legacy card"
    | "taxes"
    | "events"
    | "reset";
  electionResults: Record<string, number>;
  hasVoted: string[];
  round: number;
  finalRound: number;
  firstTurnOfRound: boolean;
  mustContinueDiscovery: boolean;
  nprCathedrals: Record<string, number>;
  turnOrder: string[];
  failedConquests: { playerId: string; tile: [number, number] }[];
  contingentPool: number[];
  infidelHostPool: InfidelHostCounter[];
  accumulatedHosts: InfidelHostCounter[];
  infidelFleet: {
    counter: InfidelHostCounter;
    location: [number, number];
    active: boolean;
  } | null;
  eventState: EventState;
}

export type BattleState = {
  attacker: BattlePlayerInfo;
  defender: BattlePlayerInfo;
};

interface BattlePlayerInfo extends PlayerInfo {
  decision: "fight" | "evade" | "undecided";
  fowCard?: FortuneOfWarCardInfo;
  victorious?: boolean;
}

export type CardDeckInfo = {
  fortuneOfWarCards: FortuneOfWarCardInfo[];
  discardedFortuneOfWarCards: FortuneOfWarCardInfo[];
  kingdomAdvantagePool: KingdomAdvantageCard[];
  legacyDeck: LegacyCardInfo[];
};

export type FortuneOfWarCardInfo = {
  name: string;
  sword: number;
  shield: number;
};

export interface PlayerFortuneOfWarCardInfo extends FortuneOfWarCardInfo {
  flipped: boolean;
}
export type PlayerOrder = {
  1: string | undefined;
  2: string | undefined;
  3: string | undefined;
  4: string | undefined;
  5: string | undefined;
  6: string | undefined;
};
export type MapState = {
  currentTileArray: TileInfoProps[][];
  discoveredTiles: boolean[][];
  buildings: MapBuildingInfo[][];
  mostRecentlyDiscoveredTile: number[];
  discoveredRaces: string[];
  battleMap: string[][][];
  currentBattle: number[];
  goodsPriceMarkers: GoodsPriceMarkers;
};
export type GoodKey = "mithril" | "dragonScales" | "krakenSkin" | "magicDust" | "stickyIchor" | "pipeweed";

export type GoodsPriceMarkers = {
  mithril: number;
  dragonScales: number;
  krakenSkin: number;
  magicDust: number;
  stickyIchor: number;
  pipeweed: number;
};
export type MapBuildingInfo = {
  player?: PlayerInfo;
  buildings?: "outpost" | "colony";
  fort: boolean;
  garrisonedRegiments: number;
  garrisonedLevies: number;
  /** Contingent counter occupying this colony (Colonial REBELLION loss) */
  rebelCounter?: number;
};

export type PlayerInfo = {
  id: string;
  kingdomName: KingdomName;
  colour: (typeof PlayerColour)[keyof typeof PlayerColour];
  ready: boolean;
  passed: boolean;
  resources: Resources;
  isArchprelate: boolean;
  playerBoardCounsellorLocations: PlayerBoardInfo;
  hereticOrOrthodox: "heretic" | "orthodox";
  fleetInfo: FleetInfo[];
  cathedrals: number;
  palaces: number;
  heresyTracker: number;
  prisoners: number;
  shipyards: number;
  factories: number;
  troopsToGarrison?: TroopInfo;
  turnComplete: boolean;
  legacyCardOptions: LegacyCardInfo[];
};

type TroopInfo = { regiments: number; levies: number };

export type KingdomName =
  | "Angland"
  | "Gallois"
  | "Castillia"
  | "Nordmark"
  | "Ostreich"
  | "Constantium";

export type FleetInfo = {
  fleetId: number;
  location: number[];
  skyships: number;
  regiments: number;
  levies: number;
};

export type PlayerBoardInfo = {
  buildSkyships: boolean;
  conscriptLevies: boolean;
  dispatchSkyshipFleet: boolean;
  trainTroops: boolean;
  dispatchDisabled: boolean;
};

export type TileLoot = {
  gold: number;
  mithril: number;
  dragonScales: number;
  krakenSkin: number;
  magicDust: number;
  stickyIchor: number;
  pipeweed: number;
  victoryPoints: number;
};

export interface Resources extends TileLoot {
  counsellors: number;
  skyships: number;
  regiments: number;
  levies: number;
  fortuneCards: PlayerFortuneOfWarCardInfo[];
  advantageCard: KingdomAdvantageCard | undefined;
  eliteRegiments: number;
  eventCards: EventCardName[];
  legacyCard: LegacyCardInfo | undefined;
  smugglerGoodChoice: GoodKey | undefined;
}
export type KingdomAdvantageCard =
  | "elite_regiments"
  | "improved_training"
  | "licenced_smugglers"
  | "more_efficient_taxation"
  | "more_prisons"
  | "patriarch_of_the_church"
  | "sanctioned_piracy";

export type EventCardName =
  | "zeeland_turns_heretic"
  | "venoa_turns_heretic"
  | "treacherous_creatures"
  | "the_great_fire"
  | "the_faerie_plague"
  | "schism"
  | "royal_succession"
  | "pretender_rebellion"
  | "prelacy_condemned"
  | "peace_accord_reached"
  | "peasant_rebellion"
  | "patrons_of_the_arts"
  | "orthodox_rebellion"
  | "mysterious_disappearances"
  | "monsters_awake"
  | "lenders_refuse_credit"
  | "infidels_invade_faerie"
  | "infidel_corsairs_raid"
  | "heretic_rebellion"
  | "headstrong_commander"
  | "grand_infidel_dies"
  | "faerie_uprising"
  | "dynastic_marriage"
  | "defence_of_the_faith"
  | "crops_fail"
  | "colonial_rebellion"
  | "colonial_prelates"
  | "bumper_crops"
  | "archprelate_dies"
  | "allies_in_faerie"
  | "a_kingdom_turns_heretic";

export type InfidelHostCounter = {
  swords: number;
  shields: number;
  isFleet: boolean;
  isInvasionTrigger: boolean;
};

export type DeferredEvent = {
  card: EventCardName;
  targetPlayerID: string;
  /** Colony tile coordinates (Colonial REBELLION only) */
  targetTile?: [number, number];
};

export type EventState = {
  deck: EventCardName[];
  chosenCards: EventCardName[];
  resolvedEvent: EventCardName | null;
  deferredEvents: DeferredEvent[];
  taxModifier: number;
  peaceAccordActive: boolean;
  schismAffected: string[];
  colonialPrelatesActive: boolean;
  dynasticMarriage: [string, string] | null;
  lendersRefuseCredit: string[];
  nprHeretic: string[];
  skipTaxesNextRound: boolean;
  cannotConvertThisRound: string[];
  grandInfidelDies: boolean;
};

export type LegacyCardName =
  | "the builder"
  | "the conqueror"
  | "the navigator"
  | "the great"
  | "the magnificent"
  | "the merchant"
  | "the mighty"
  | "the aviator"
  | "the pious";

export type LegacyCardColour = "purple" | "orange";

export type LegacyCardInfo = {
  name: LegacyCardName;
  colour: LegacyCardColour;
};

export const PlayerColour = {
  red: "#DC5454",
  green: "#478779",
  yellow: "#F5DE48",
  blue: "#51658D",
  brown: "#A0522D",
  white: "#E6EFE9",
} as const;

export type TileInfoProps = {
  name: string;
  blocked: string[];
  sword: number;
  shield: number;
  loot: LootInfo;
  type: "land" | "ocean" | "legend" | "home" | "infidel_empire";
};

interface LootInfo {
  outpost: TileLoot;
  colony: TileLoot;
}

export type ActionBoardInfo = {
  pendingPlayerOrder: {
    1: string | undefined;
    2: string | undefined;
    3: string | undefined;
    4: string | undefined;
    5: string | undefined;
    6: string | undefined;
  };
  recruitCounsellors: {
    1: string | undefined;
    2: string | undefined;
    3: string | undefined;
  };
  recruitRegiments: {
    1: string | undefined;
    2: string | undefined;
    3: string | undefined;
    4: string | undefined;
    5: string | undefined;
    6: string | undefined;
  };
  purchaseSkyshipsZeeland: {
    1: string | undefined;
    2: string | undefined;
  };
  purchaseSkyshipsVenoa: {
    1: string | undefined;
    2: string | undefined;
  };
  foundBuildings: {
    1: string[];
    2: string[];
    3: string[];
    4: string[];
  };
  foundFactories: {
    1: string | undefined;
    2: string | undefined;
    3: string | undefined;
    4: string | undefined;
  };
  influencePrelates: {
    1: string | undefined;
    2: string | undefined;
    3: string | undefined;
    4: string | undefined;
    5: string | undefined;
    6: string | undefined;
    7: string | undefined;
    8: string | undefined;
  };
  punishDissenters: {
    1: string | undefined;
    2: string | undefined;
    3: string | undefined;
    4: string | undefined;
    5: string | undefined;
    6: string | undefined;
  };
  convertMonarch: {
    1: string | undefined;
    2: string | undefined;
    3: string | undefined;
    4: string | undefined;
    5: string | undefined;
    6: string | undefined;
  };
  issueHolyDecree: boolean;
};
