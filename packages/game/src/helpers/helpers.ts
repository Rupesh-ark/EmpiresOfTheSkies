import {
  FortuneOfWarCardInfo,
  MyGameState,
} from "../types";
import { fortuneOfWarCards, ASSIGNABLE_KINGDOMS } from "../data/gameData";
import { getNeighbors, getPassableNeighbors } from "./mapUtils";
import { Ctx } from "boardgame.io";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

export const fullResetFortuneOfWarCardDeck = (): FortuneOfWarCardInfo[] => {
  return [...fortuneOfWarCards];
};

export const resetFortuneOfWarCardDeck = (
  props: MyGameState,
  shuffle: <T>(arr: T[]) => T[]
) => {
  props.cardDecks.fortuneOfWarCards = shuffle(
    props.cardDecks.fortuneOfWarCards.concat(props.cardDecks.discardedFortuneOfWarCards)
  );
  props.cardDecks.discardedFortuneOfWarCards = [];
};

export const findPossibleDestinations = (
  G: MyGameState,
  startingCoords: number[],
  unlaiden: boolean
): [number, number][][] => {
  let availableGridLocations: [number, number][] = [];
  let coordinatesToSearch: number[][] = [startingCoords];
  let coordinatesToSearchNext: [number, number][] = [];
  let coordsGroupedByCost: [number, number][][] = [];
  for (let i = 0; i < 3; i++) {
    coordinatesToSearch.forEach((coords) => {
      const [x, y] = coords;
      // Use mountain-aware neighbors from mapUtils for laden fleets,
      // or all neighbors for unladen fleets (mountains don't block)
      const neighbors = unlaiden
        ? getNeighbors(x, y)
        : getPassableNeighbors(x, y, G.mapState.currentTileArray);
      neighbors.forEach(([nx, ny]) => {
        if (
          G.mapState.discoveredTiles[ny]?.[nx] &&
          (ny !== 0 || nx !== 4) // exclude home tile
        ) {
          availableGridLocations.push([nx, ny]);
          coordinatesToSearchNext.push([nx, ny]);
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

export const countOrthodoxRealms = (G: MyGameState): number => {
  const assignedKingdoms = new Set(
    Object.values(G.playerInfo).map((p) => p.kingdomName)
  );

  let total = 0;
  Object.values(G.playerInfo).forEach((info) => {
    if (info.hereticOrOrthodox === "orthodox") total += 1;
  });

  ASSIGNABLE_KINGDOMS.forEach((k) => {
    if (!assignedKingdoms.has(k) && !G.eventState.nprHeretic.includes(k)) {
      total += 1;
    }
  });

  if (!G.eventState.nprHeretic.includes("Zeeland")) total += 1;
  if (!G.eventState.nprHeretic.includes("Venoa")) total += 1;

  return total;
};

export const blessingOrCurseVPAmount = (G: MyGameState): number => {
  return Math.min(3, Math.ceil(countOrthodoxRealms(G) / 3));
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

export const drawFortuneOfWarCard = (
  G: MyGameState,
  shuffle: <T>(arr: T[]) => T[]
): FortuneOfWarCardInfo => {
  if (G.cardDecks.fortuneOfWarCards.length === 0) {
    resetFortuneOfWarCardDeck(G, shuffle);
  }
  const card = G.cardDecks.fortuneOfWarCards.splice(0, 1)[0];
  G.cardDecks.discardedFortuneOfWarCards.push(card);

  // No Effect → discard, reshuffle discard into deck, draw again
  const isNoEffect = card.sword === 0 && card.shield === 0;
  if (isNoEffect) {
    resetFortuneOfWarCardDeck(G, shuffle);
    // Guard against infinite loop if all remaining cards are No Effect
    const hasRealCard = G.cardDecks.fortuneOfWarCards.some(
      (c) => c.sword !== 0 || c.shield !== 0
    );
    if (hasRealCard) {
      return drawFortuneOfWarCard(G, shuffle);
    }
  }
  return card;
};

// Tile query helpers
// Reusable functions for checking tile state. All accept optional playerID
// to scope the check to a specific player.

/** Check if a tile has a fort (optionally owned by a specific player) */
export const hasFortAt = (
  G: MyGameState,
  x: number,
  y: number,
  playerID?: string
): boolean => {
  const tile = G.mapState.buildings[y]?.[x];
  if (!tile?.fort?.length) return false;
  if (playerID) return tile.fort.includes(playerID);
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

let battleCheckCount = 0;
export const resetBattleCheckCount = (): void => { battleCheckCount = 0; };

export const checkIfCurrentPlayerIsInCurrentBattle = (
  G: MyGameState,
  ctx: Ctx,
  events: EventsAPI
) => {
  battleCheckCount++;
  if (battleCheckCount > 50) {
    console.error('[BATTLE-CHECK] called ' + battleCheckCount + 'x P' + ctx.currentPlayer + ' sub=' + G.stage?.sub + ' battle=' + JSON.stringify(G.mapState.currentBattle));
    if (battleCheckCount > 100) return; // break the loop
  }
  const [x, y] = G.mapState.currentBattle;

  if (G.mapState.battleMap[y][x].length > 0) {
    // Battle sub-stage routing
    // Each sub-stage has a specific player who should act. Route to them.
    // Uses ctx.phase to disambiguate shared G.stage values, and
    // G.battleState to identify attacker/defender/victor.
    const bs = G.battleState;
    const sub = G.stage.sub;
    const isBattleStage = sub === "aerial_attack_or_pass" || sub === "aerial_attack_or_evade"
      || sub === "aerial_resolve" || sub === "ground_attack_or_pass"
      || sub === "ground_defend_or_yield" || sub === "ground_resolve"
      || sub === "ground_garrison" || sub === "relocate_loser";
    if (bs && isBattleStage) {
      let target: string | undefined;

      switch (G.stage.sub) {
        case "aerial_attack_or_pass":
        case "ground_attack_or_pass":
          // Normal turn order — attacker picks target or passes
          break;

        case "aerial_attack_or_evade":   // aerial: defender decides to evade or fight
        case "ground_defend_or_yield":   // ground: defender decides to defend or yield
          target = bs.defender?.id;
          break;

        case "aerial_resolve":
        case "ground_resolve":
          // Both sides commit FoW cards — route to whoever hasn't committed yet
          if (!bs.attacker?.fowCard) target = bs.attacker?.id;
          else if (!bs.defender?.fowCard) target = bs.defender?.id;
          break;

        case "relocate_loser":
          // After evasion: attacker relocates the evader
          // After battle: victor relocates the loser
          if (bs.defender?.decision === "evade") {
            target = bs.attacker?.id;
          } else {
            target = bs.attacker?.victorious ? bs.attacker.id : bs.defender?.id;
          }
          break;

        case "ground_garrison":
        case "conquest_garrison":
          // Victor garrisons troops at the captured building
          target = bs.attacker?.victorious ? bs.attacker.id : bs.defender?.id;
          break;
      }

      if (target) {
        if (target !== ctx.currentPlayer) {
          events.endTurn({ next: target });
        }
        return; // target found — don't fall through to battleMap fallback
      }
    }

    // Fallback: if current player isn't on this tile at all, redirect to first player there
    // Guard: only redirect if the target is different from current player (prevents infinite endTurn loop)
    if (!G.mapState.battleMap[y][x].includes(ctx.currentPlayer)) {
      const fallbackTarget = G.mapState.battleMap[y][x][0];
      if (fallbackTarget && fallbackTarget !== ctx.currentPlayer) {
        events.endTurn({ next: fallbackTarget });
      }
    }
  }
};
