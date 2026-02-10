import {
  FortuneOfWarCardInfo,
  MyGameState,
  MyGameProps,
  PlayerInfo,
} from "../types";
import { fortuneOfWarCards } from "../codifiedGameInfo";
import { Ctx } from "boardgame.io";
// FIX: Removed broken import of EventsAPI
import {
  findNextBattle,
  findNextConquest,
  findNextGroundBattle,
  findNextPlunder,
} from "./findNext";

export const clearMoves = (props: MyGameProps) => {
  if (props.ctx.numMoves) {
    console.log(`undoing ${props.ctx.numMoves} move(s)`);

    for (let i = 0; i < props.ctx.numMoves; i++) {
      props.undo();
    }
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer].turnComplete =
      false;
  }
};

export const checkPlayerIDAndReturnPlayerInfo = (
  props: MyGameProps
): PlayerInfo => {
  let playerInfo;
  if (props.playerID) {
    playerInfo = props.G.playerInfo[props.playerID];
  } else {
    throw new Error("No playerID found in props");
  }
  return playerInfo;
};

export const fullResetFortuneOfWarCardDeck = (): FortuneOfWarCardInfo[] => {
  const fullDeck: FortuneOfWarCardInfo[] =
    fortuneOfWarCards.concat(fortuneOfWarCards);

  return [...fullDeck];
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
  const cardDeck = G.cardDecks.fortuneOfWarCards;
  let randomIndex = Math.floor(Math.random() * cardDeck.length);

  //checking if the card is a no effect card
  while (
    cardDeck[randomIndex].shield === 0 &&
    cardDeck[randomIndex].sword === 0
  ) {
    resetFortuneOfWarCardDeck(G);
    randomIndex = Math.floor(Math.random() * cardDeck.length);
  }
  const card = cardDeck[randomIndex];
  G.cardDecks.discardedFortuneOfWarCards.push(cardDeck[randomIndex]);
  G.cardDecks.fortuneOfWarCards.splice(randomIndex, 1);
  return card;
};

export const checkIfCurrentPlayerIsInCurrentBattle = (
  G: MyGameState,
  ctx: Ctx,
  events: any
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