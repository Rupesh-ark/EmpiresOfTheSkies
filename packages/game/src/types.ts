import type { BoardProps } from "boardgame.io/react";
import type { Ctx, DefaultPluginAPIs } from "boardgame.io";

// The exports map added in boardgame.io 0.51 blocks deep imports of plugin
// types, so derive them from the public DefaultPluginAPIs instead and
// re-export for the rest of the package.
export type EventsAPI = DefaultPluginAPIs["events"];
export type RandomAPI = DefaultPluginAPIs["random"];

export interface MyGameProps extends BoardProps<MyGameState> {}

export type MoveError = {
  code: string;
  message: string;
};

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

// Discriminated-union game stage
export type GameStage =
  | { phase: "setup";      sub: "kingdom_advantage" | "legacy_card" }
  | { phase: "events";     sub: "default" | "immediate_election" }
  | { phase: "discovery";  sub: "default" }
  | { phase: "taxes";      sub: "default" }
  | { phase: "actions";    sub: "default" | "confirm_fow_draw" | "discard_fow" }
  | { phase: "resolution"; sub:
      | "rebellion" | "rebellion_rival_support"
      | "aerial_attack_or_pass" | "aerial_attack_or_evade" | "aerial_resolve"
      | "plunder_legends"
      | "ground_attack_or_pass" | "ground_defend_or_yield" | "ground_resolve" | "ground_garrison"
      | "relocate_loser"
      | "conquest" | "conquest_draw_or_pick" | "conquest_garrison"
      | "election"
      | "infidel_fleet_combat" | "deferred_battle"
      | "invasion_nominate" | "invasion_contribute" | "invasion_buyoff"
      | "retrieve_fleets"
    }
  | { phase: "scoring";    sub: "default" }
  | { phase: "reset";      sub: "default" | "round_summary" };

export type StagePhase = GameStage["phase"];
export type StageSub = GameStage["sub"];

export interface MyGameState {
  playerInfo: { [details: string]: PlayerInfo };
  mapState: MapState;
  boardState: ActionBoardInfo;
  cardDecks: CardDeckInfo;
  battleState?: BattleState;
  battleResult: BattleResult | null;
  /** "attacker>defender" pairs at the current battle tile; a defender may
   *  not be re-challenged by the same attacker (resets on tile change). */
  aerialChallenges?: { tile: [number, number]; pairs: string[] };
  conquestState?: BattlePlayerInfo;
  pendingDeal?: DealProposal;
  possibleDefenders: string[];
  validRelocationTiles: number[][];
  troopsAvailableForGarrison: { regiments: number; elites: number; levies: number };
  stage: GameStage;
  electionResults: Record<string, number>;
  hasVoted: string[];
  roundSummaryAck: string[];
  voteSubmitted: Record<string, string>;
  consecutiveArchprelateWins: number;
  round: number;
  finalRound: number;
  firstTurnOfRound: boolean;
  mustContinueDiscovery: boolean;
  nprCathedrals: Record<string, number>;
  turnOrder: string[];
  validFortLocations: [number, number][];
  failedConquests: { playerId: string; tile: [number, number] }[];
  tradeGainsThisRound: Record<string, number>;
  contingentPool: number[];
  infidelHostPool: InfidelHostCounter[];
  accumulatedHosts: InfidelHostCounter[];
  gameLog: { round: number; message: string; debug?: boolean }[];
  infidelFleet: {
    counter: InfidelHostCounter;
    location: [number, number];
    active: boolean;
    destroyed: boolean;
  } | null;
  eventState: EventState;
  currentRebellion: {
    event: DeferredEvent;
    counterSwords: number;
      defenderRegiments?: number;
    defenderLevies?: number;
    fowCard?: FortuneOfWarCardInfo;
    rivalContributions?: Record<string, {
      side: "defender" | "rebel";
      regiments: number;
      levies: number;
    }>;
  } | null;
  currentInvasion: {
    totalHostSwords: number;
    contributions: Record<string, { regiments: number; levies: number; skyships: number }>;
    phase: "nominate" | "contribute" | "buyoff";
    buyoffCost?: number;
    buyoffOffered?: Record<string, number>;
    eligibleCaptainGenerals: string[];
  } | null;
  infidelFleetCombat: {
    targetPlayerID: string;
    fleetIndex: number;
  } | null;
  currentDeferredBattle: {
    event: DeferredEvent;
    description: string;
  } | null;
  mercyGold: Record<string, number>;
  _loopGuard: number;
  _halted: boolean;
  _matchID?: string;
}

export type BattleResult = {
  battleType: string;
  attackerName: string;
  defenderName: string;
  attackerSwords: number;
  attackerShields: number;
  defenderSwords: number;
  defenderShields: number;
  attackerFoW: { sword: number; shield: number } | null;
  defenderFoW: { sword: number; shield: number } | null;
  attackerLosses: string;
  defenderLosses: string;
  winner: string;
  outcome: string;
};

export type BattleState = {
  attacker: BattlePlayerInfo;
  defender: BattlePlayerInfo;
};

interface BattlePlayerInfo extends PlayerInfo {
  decision: "fight" | "evade" | "undecided";
  fowCard?: FortuneOfWarCardInfo;
  fowSource?: "hand" | "deck";
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
  routeSkyships: Record<string, string[]>;
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
/**
 * Slim ownership reference stored on map cells. Deliberately NOT the full
 * PlayerInfo: embedding the whole player (resources, fleets, cards) in every
 * owned cell bloated each state broadcast, DB write, and AI state clone.
 * Old persisted matches still load — a full PlayerInfo is a superset.
 */
export type MapBuildingOwner = Pick<PlayerInfo, "id" | "colour" | "kingdomName">;

export type MapBuildingInfo = {
  player?: MapBuildingOwner;
  buildings?: "outpost" | "colony";
  fort: string[];
  garrisonedRegiments: number;
  garrisonedLevies: number;
  garrisonedEliteRegiments: number;
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
  isCaptainGeneral: boolean;
  playerBoardCounsellorLocations: PlayerBoardInfo;
  hereticOrOrthodox: "heretic" | "orthodox";
  fleetInfo: FleetInfo[];
  cathedrals: number;
  palaces: number;
  heresyTracker: number;
  prisoners: number;
  freeDissenters: number;
  piracyIntent: "tax" | "cut";
  agitatorsSentThisRound: string[];
  shipyards: number;
  factories: number;
  troopsToGarrison?: TroopInfo;
  turnComplete: boolean;
  legacyCardOptions: LegacyCardInfo[];
  actionsTakenThisRound: number;
};

type TroopInfo = { regiments: number; levies: number };

export type KingdomName =
  | "Angland"
  | "Gallois"
  | "Castillia"
  | "Normark"
  | "Ostreich"
  | "Constantium";

export type FleetInfo = {
  fleetId: number;
  location: number[];
  skyships: number;
  regiments: number;
  levies: number;
  eliteRegiments: number;
  travelHistory: [number, number][];
  dispatchedThisRound?: boolean;
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
  | "race_to_discovery"
  | "royal_patronage"
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
  | "guild_revolt"
  | "grand_infidel_dies"
  | "foreign_agitators"
  | "faerie_uprising"
  | "dynastic_marriage"
  | "defence_of_the_faith"
  | "crops_fail"
  | "corruption_scandal"
  | "colonial_rebellion"
  | "colonial_prelates"
  | "bumper_crops"
  | "archprelate_dies"
  | "allies_in_faerie"
  | "a_kingdom_turns_heretic"
  | "return_to_orthodoxy";

export type InfidelHostCounter = {
  swords: number;
  shields: number;
  isFleet: boolean;
  isInvasionTrigger: boolean;
};

export type DeferredEvent = {
  card: EventCardName;
  targetPlayerID: string;
  targetTile?: [number, number];
};

export type EventChoice = {
  card: EventCardName;
  targetPlayerID: string;
  legacyOptions?: LegacyCardInfo[];
  buildingOptions?: ("cathedral" | "palace" | "shipyard")[];
  allyOptions?: string[];
  binaryOptions?: [string, string];
  colonyOptions?: [number, number][];
};

export type EventState = {
  deck: EventCardName[];
  lateDeck: EventCardName[];
  chosenCards: EventCardName[];
  eventContributions: Record<string, EventCardName>;
  resolvedEvent: EventCardName | null;
  deferredEvents: DeferredEvent[];
  pendingChoice: EventChoice | null;
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
  royalPatronageActive: boolean;
  raceToDiscoveryCounters: Record<string, number> | null;
  immediateElectionPending: boolean;
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
  recruitCounsellors: string[];
  recruitRegiments: string[];
  purchaseSkyshipsZeeland: string[];
  purchaseSkyshipsVenoa: string[];
  foundBuildings: {
    1: string[];
    2: string[];
    3: string[];
    4: string[];
  };
  foundFactories: string[];
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
  punishDissenters: string[];
  convertMonarch: string[];
  issueHolyDecree: boolean;
};

export type MoveContext = {
  G: MyGameState;
  playerID: string;
  ctx?: Ctx;
  events?: EventsAPI;
  random?: RandomAPI;
};

export type MoveDefinition = {
  fn: (context: MoveContext, ...args: any[]) => any;
  errorMessage: string;
  successLog?: (G: MyGameState, playerID: string, ...args: any[]) => string | null;
  validate?: (G: MyGameState, playerID: string, ...args: any[]) => MoveError | null;
};
