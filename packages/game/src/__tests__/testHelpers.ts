/**
 * testHelpers.ts
 *
 * Shared factory functions for building valid MyGameState objects in tests.
 * All defaults match v4.2 starting values from STARTING_RESOURCES and codifiedGameInfo.ts.
 */

import { MyGameState, PlayerInfo, ActionBoardInfo, Resources, FleetInfo, PlayerBoardInfo } from "../types";
import { fortuneOfWarCards } from "../codifiedGameInfo";

// ── Player builder ────────────────────────────────────────────────────────────

export function buildPlayer(id: string, overrides: Partial<PlayerInfo> = {}): PlayerInfo {
  return {
    id,
    kingdomName: id === "0" ? "Angland" : "Gallois",
    colour: id === "0" ? "#DC5454" : "#478779",
    ready: true,
    passed: false,
    isArchprelate: false,
    isCaptainGeneral: false,
    hereticOrOrthodox: "orthodox",
    heresyTracker: 0, // actual game starting value (playerSetup.ts)
    prisoners: 0,
    shipyards: 0,
    factories: 1,      // v4.2: all players start with 1 factory
    cathedrals: 1,
    palaces: 1,
    turnComplete: false,
    legacyCardOptions: [],
    troopsToGarrison: undefined,
    resources: buildResources(),
    playerBoardCounsellorLocations: buildPlayerBoard(),
    fleetInfo: [buildFleet(0)],
    ...overrides,
  };
}

export function buildResources(overrides: Partial<Resources> = {}): Resources {
  return {
    gold: 6,            // v4.2 starting gold
    victoryPoints: 10,  // codifiedGameInfo STARTING_RESOURCES
    counsellors: 4,     // v4.2: starts at 4, max 7
    skyships: 3,
    regiments: 6,
    levies: 0,          // v4.2: starts at 0, max 12
    eliteRegiments: 0,
    mithril: 0,
    dragonScales: 0,
    krakenSkin: 0,
    magicDust: 0,
    stickyIchor: 0,
    pipeweed: 0,
    fortuneCards: [],
    advantageCard: undefined,
    eventCards: [],
    legacyCard: undefined,
    smugglerGoodChoice: undefined,
    ...overrides,
  };
}

export function buildPlayerBoard(overrides: Partial<PlayerBoardInfo> = {}): PlayerBoardInfo {
  return {
    buildSkyships: false,
    conscriptLevies: false,
    dispatchSkyshipFleet: false,
    trainTroops: false,
    dispatchDisabled: false,
    ...overrides,
  };
}

export function buildFleet(fleetId: number, overrides: Partial<FleetInfo> = {}): FleetInfo {
  return {
    fleetId,
    location: [0, 0],
    skyships: 3,
    regiments: 0,
    levies: 0,
    ...overrides,
  };
}

// ── ActionBoard builder ───────────────────────────────────────────────────────

export function buildActionBoard(overrides: Partial<ActionBoardInfo> = {}): ActionBoardInfo {
  return {
    pendingPlayerOrder: { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined },
    recruitCounsellors: { 1: undefined, 2: undefined, 3: undefined },
    recruitRegiments: { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined },
    purchaseSkyshipsZeeland: { 1: undefined, 2: undefined },
    purchaseSkyshipsVenoa: { 1: undefined, 2: undefined },
    foundBuildings: { 1: [], 2: [], 3: [], 4: [] },
    foundFactories: { 1: undefined, 2: undefined, 3: undefined, 4: undefined },
    influencePrelates: { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined, 7: undefined, 8: undefined },
    punishDissenters: { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined },
    convertMonarch: { 1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined, 6: undefined },
    issueHolyDecree: false,
    ...overrides,
  };
}

// ── Full game state builder ───────────────────────────────────────────────────

/**
 * Returns a minimal valid MyGameState for two players ("0" and "1").
 * Extra players can be added via the `players` parameter.
 */
export function buildInitialG(
  players: PlayerInfo[] = [buildPlayer("0"), buildPlayer("1")],
  overrides: Partial<MyGameState> = {}
): MyGameState {
  const playerInfo: Record<string, PlayerInfo> = {};
  for (const p of players) {
    playerInfo[p.id] = p;
  }

  return {
    stage: "actions",
    round: 1,
    finalRound: 4,
    firstTurnOfRound: true,
    mustContinueDiscovery: false,
    nprCathedrals: {},
    electionResults: {},
    hasVoted: [],
    voteSubmitted: {},
    turnOrder: players.map((p) => p.id),
    playerInfo,
    boardState: buildActionBoard(),
    cardDecks: {
      fortuneOfWarCards: [...fortuneOfWarCards],
      discardedFortuneOfWarCards: [],
      kingdomAdvantagePool: [],
      legacyDeck: [],
    },
    mapState: {
      currentTileArray: [],
      discoveredTiles: [],
      buildings: [],
      mostRecentlyDiscoveredTile: [],
      discoveredRaces: [],
      battleMap: [],
      currentBattle: [],
      goodsPriceMarkers: {
        mithril: 2,
        dragonScales: 2,
        krakenSkin: 2,
        magicDust: 2,
        stickyIchor: 2,
        pipeweed: 2,
      },
    },
    failedConquests: [],
    contingentPool: [10, 10, 7, 7],
    infidelHostPool: [],
    accumulatedHosts: [],
    infidelFleet: null,
    gameLog: [],
    currentRebellion: null,
    currentInvasion: null,
    infidelFleetCombat: null,
    pendingDeal: undefined,
    currentDeferredBattle: null,
    eventState: {
      deck: [],
      chosenCards: [],
      resolvedEvent: null,
      deferredEvents: [],
      pendingChoice: null,
      taxModifier: 0,
      peaceAccordActive: false,
      schismAffected: [],
      colonialPrelatesActive: false,
      dynasticMarriage: null,
      lendersRefuseCredit: [],
      nprHeretic: [],
      skipTaxesNextRound: false,
      cannotConvertThisRound: [],
      grandInfidelDies: false,
    },
    ...overrides,
  };
}

// ── Move invocation helper ────────────────────────────────────────────────────

/**
 * Simulates calling a boardgame.io move function directly.
 * The move receives `{ G, ctx, playerID }` and may return a new G or mutate in place.
 * Returns the (possibly mutated) G.
 *
 * Note: boardgame.io moves use Immer under the hood in real games. In tests
 * we pass G directly so mutations apply in place.
 */
export function callMove<TArgs extends unknown[]>(
  moveFn: (params: { G: MyGameState; ctx: MockCtx; playerID: string }, ...args: TArgs) => unknown,
  G: MyGameState,
  playerID: string,
  ...args: TArgs
): { G: MyGameState; result: unknown } {
  const ctx = buildCtx(playerID);
  const result = moveFn({ G, ctx, playerID }, ...args);
  return { G, result };
}

export type MockCtx = {
  currentPlayer: string;
  playOrderPos: number;
  numPlayers: number;
  events: { endTurn: () => void; endPhase: () => void };
};

export function buildCtx(currentPlayer: string, numPlayers = 2): MockCtx {
  return {
    currentPlayer,
    playOrderPos: 0,
    numPlayers,
    events: {
      endTurn: () => {},
      endPhase: () => {},
    },
  };
}