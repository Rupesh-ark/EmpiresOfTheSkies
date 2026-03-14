import {
  FortuneOfWarCardInfo,
  MyGameState,
} from "../types";
import { fortuneOfWarCards } from "../codifiedGameInfo";
import { Ctx } from "boardgame.io";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import {
  findNextBattle,
  findNextConquest,
  findNextGroundBattle,
  findNextPlunder,
} from "./findNext";

export const fullResetFortuneOfWarCardDeck = (): FortuneOfWarCardInfo[] => {
  return [...fortuneOfWarCards];
};

export const resetFortuneOfWarCardDeck = (props: MyGameState) => {
  props.cardDecks.fortuneOfWarCards = props.cardDecks.fortuneOfWarCards.concat(
    props.cardDecks.discardedFortuneOfWarCards
  );
  props.cardDecks.discardedFortuneOfWarCards = [];
};

export const findPossibleDestinations = (
  G: MyGameState,
  startingCoords: number[],
  unlaiden: boolean
): number[][][] => {
  let availableGridLocations: number[][] = [];
  let coordinatesToSearch: number[][] = [startingCoords];
  let coordinatesToSearchNext: number[][] = [];
  let coordsGroupedByCost: number[][][] = [];
  for (let i = 0; i < 3; i++) {
    coordinatesToSearch.forEach((coords) => {
      const [x, y] = coords;
      const coordinatesMap = {
        N: [x, y - 1],
        NE: [(((x + 1) % 8) + 8) % 8, y - 1],
        E: [(((x + 1) % 8) + 8) % 8, y],
        SE: [(((x + 1) % 8) + 8) % 8, y + 1],
        S: [x, y + 1],
        SW: [(((x - 1) % 8) + 8) % 8, y + 1],
        W: [(((x - 1) % 8) + 8) % 8, y],
        NW: [(((x - 1) % 8) + 8) % 8, y - 1],
      };
      const currentTile = G.mapState.currentTileArray[y][x];
      Object.entries(coordinatesMap).forEach(([key, value]) => {
        if (
          (!currentTile.blocked.includes(key) || unlaiden) &&
          value[1] >= 0 &&
          value[1] <= 3 &&
          G.mapState.discoveredTiles[value[1]][value[0]] === true &&
          (value[1] !== 0 || value[0] !== 4)
        ) {
          availableGridLocations.push(value);
          coordinatesToSearchNext.push(value);
        }
      });
    });
    coordsGroupedByCost.push([...coordinatesToSearchNext]);
    coordinatesToSearch = [...coordinatesToSearchNext];
    coordinatesToSearchNext = [];
  }

  return [availableGridLocations, ...coordsGroupedByCost];
};

export const findMostOrthodoxKingdoms = (G: MyGameState): string[] => {
  let currentLowestHeresyTracker: number = 12;
  let currentLowestKingdoms: string[] = [];

  Object.entries(G.playerInfo).forEach(([id, info]) => {
    if (info.hereticOrOrthodox === "orthodox") {
      if (info.heresyTracker < currentLowestHeresyTracker) {
        currentLowestHeresyTracker = info.heresyTracker;
        currentLowestKingdoms = [id];
      } else if (info.heresyTracker === currentLowestHeresyTracker) {
        currentLowestKingdoms.push(id);
      }
    }
  });

  return currentLowestKingdoms;
};

export const findMostHereticalKingdoms = (G: MyGameState): string[] => {
  let currentHighestHeresyTracker: number = -12;
  let currentHighestKingdoms: string[] = [];

  Object.entries(G.playerInfo).forEach(([id, info]) => {
    if (info.hereticOrOrthodox === "heretic") {
      if (info.heresyTracker > currentHighestHeresyTracker) {
        currentHighestHeresyTracker = info.heresyTracker;
        currentHighestKingdoms = [id];
      } else if (info.heresyTracker === currentHighestHeresyTracker) {
        currentHighestKingdoms.push(id);
      }
    }
  });

  if (currentHighestKingdoms.length === 0) {
    Object.entries(G.playerInfo).forEach(([id, info]) => {
      if (info.heresyTracker > currentHighestHeresyTracker) {
        currentHighestHeresyTracker = info.heresyTracker;
        currentHighestKingdoms = [id];
      } else if (info.heresyTracker === currentHighestHeresyTracker) {
        currentHighestKingdoms.push(id);
      }
    });
  }

  return currentHighestKingdoms;
};

export const blessingOrCurseVPAmount = (G: MyGameState): number => {
  let total = 0;
  Object.values(G.playerInfo).forEach((info) => {
    if (info.hereticOrOrthodox === "orthodox") {
      total += 1;
    }
  });

  return Math.floor(total / 3);
};

export const sortPlayersInPlayerOrder = (
  playerIDs: string[],
  G: MyGameState
) => {
  const sortedPlayerIDs: string[] = [];
  G.turnOrder.forEach((id) => {
    if (playerIDs.includes(id)) {
      sortedPlayerIDs.push(id);
    }
  });
  return sortedPlayerIDs;
};

export const drawFortuneOfWarCard = (G: MyGameState): FortuneOfWarCardInfo => {
  if (G.cardDecks.fortuneOfWarCards.length === 0) {
    resetFortuneOfWarCardDeck(G);
  }
  const card = G.cardDecks.fortuneOfWarCards.splice(0, 1)[0];
  G.cardDecks.discardedFortuneOfWarCards.push(card);

  // v4.2: No Effect → discard, reshuffle discard into deck, draw again
  const isNoEffect = card.sword === 0 && card.shield === 0;
  if (isNoEffect) {
    resetFortuneOfWarCardDeck(G);
    // Guard against infinite loop if all remaining cards are No Effect
    const hasRealCard = G.cardDecks.fortuneOfWarCards.some(
      (c) => c.sword !== 0 || c.shield !== 0
    );
    if (hasRealCard) {
      return drawFortuneOfWarCard(G);
    }
  }
  return card;
};

// ── Tile query helpers ────────────────────────────────────────────────────────
// Reusable functions for checking tile state. All accept optional playerID
// to scope the check to a specific player.
// TODO: Add hasSettlementAt / hasAnySettlement if a new building type is
// introduced that should count alongside outposts and colonies.

/** Check if a tile has a fort (optionally owned by a specific player) */
export const hasFortAt = (
  G: MyGameState,
  x: number,
  y: number,
  playerID?: string
): boolean => {
  const tile = G.mapState.buildings[y]?.[x];
  if (!tile?.fort) return false;
  if (playerID && tile.player?.id !== playerID) return false;
  return true;
};

/** Check if a tile has an outpost (optionally owned by a specific player) */
export const hasOutpostAt = (
  G: MyGameState,
  x: number,
  y: number,
  playerID?: string
): boolean => {
  const tile = G.mapState.buildings[y]?.[x];
  if (tile?.buildings !== "outpost") return false;
  if (playerID && tile.player?.id !== playerID) return false;
  return true;
};

/** Check if a tile has a colony (optionally owned by a specific player) */
export const hasColonyAt = (
  G: MyGameState,
  x: number,
  y: number,
  playerID?: string
): boolean => {
  const tile = G.mapState.buildings[y]?.[x];
  if (tile?.buildings !== "colony") return false;
  if (playerID && tile.player?.id !== playerID) return false;
  return true;
};

/** Check if any outpost exists on the map (optionally owned by a specific player) */
export const hasAnyOutpost = (G: MyGameState, playerID?: string): boolean => {
  for (let y = 0; y < G.mapState.buildings.length; y++) {
    for (let x = 0; x < G.mapState.buildings[y].length; x++) {
      if (hasOutpostAt(G, x, y, playerID)) return true;
    }
  }
  return false;
};

/** Check if any colony exists on the map (optionally owned by a specific player) */
export const hasAnyColony = (G: MyGameState, playerID?: string): boolean => {
  for (let y = 0; y < G.mapState.buildings.length; y++) {
    for (let x = 0; x < G.mapState.buildings[y].length; x++) {
      if (hasColonyAt(G, x, y, playerID)) return true;
    }
  }
  return false;
};

export const checkIfCurrentPlayerIsInCurrentBattle = (
  G: MyGameState,
  ctx: Ctx,
  events: EventsAPI
) => {
  const [x, y] = G.mapState.currentBattle;
  console.log("current battlemap:");
  console.log(G.mapState.battleMap.toString());
  console.log(`The bit just before the failure... ${[x, y]}`);
  if (G.mapState.battleMap[y][x].length > 0) {
    if (!G.mapState.battleMap[y][x].includes(ctx.currentPlayer)) {
      console.log("ending turn");
      events.endTurn({
        next: G.mapState.battleMap[y][x][0],
      });
    }
  } else {
    switch (ctx.phase) {
      case "aerial_battle":
        console.log("finding next aerial battle");
        findNextBattle(G, events);
        break;
      case "ground_battle":
        console.log("finding next ground battle");
        findNextGroundBattle(G, events);
        break;
      case "plunder_legends":
        console.log("finding next plunder");
        findNextPlunder(G, events);
        break;
      case "conquest":
        console.log("finding next conquest");
        findNextConquest(G, events);
        break;
    }
  }
};
