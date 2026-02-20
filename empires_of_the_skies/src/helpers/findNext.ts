import { Ctx } from "boardgame.io";
import { MyGameState } from "../types";
import { sortPlayersInPlayerOrder } from "./helpers";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";

export const findNextBattle = (G: MyGameState, events: EventsAPI) => {
  for (let y = G.mapState.currentBattle[1]; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      if (
        y === G.mapState.currentBattle[1] &&
        x <= G.mapState.currentBattle[0]
      ) {
        continue;
      }
      if (G.mapState.battleMap[y][x].length > 1) {
        const playerIDs: string[] = [...G.mapState.battleMap[y][x]];
        const nextPlayer = sortPlayersInPlayerOrder(playerIDs, G)[0];
        G.mapState.currentBattle = [x, y];
        G.battleState = undefined;
        G.stage = "attack or pass";
        console.log(
          `current battle is now ${G.mapState.currentBattle} and next possible attacker is player ${nextPlayer}`
        );
        G.stage = "attack or pass";
        events.endTurn({ next: nextPlayer });
        return;
      }
    }
  }
  G.mapState.currentBattle = [0, 0];
  G.stage = "plunder legends";
  events.endPhase();
};

export const findNextPlunder = (G: MyGameState, events: EventsAPI): void => {
  for (let y = G.mapState.currentBattle[1]; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      if (
        y === G.mapState.currentBattle[1] &&
        x <= G.mapState.currentBattle[0]
      ) {
        continue;
      } else if (
        G.mapState.currentTileArray[y][x].type === "legend" &&
        G.mapState.battleMap[y][x].length === 1
      ) {
        const nextPlayer = G.mapState.battleMap[y][x][0];
        G.mapState.currentBattle = [x, y];
        console.log(
          `current plunder is now ${G.mapState.currentBattle} with player ${nextPlayer} `
        );
        G.stage = "plunder legends";
        events.endTurn({ next: nextPlayer });
        return;
      }
    }
  }
  G.mapState.currentBattle = [0, 0];
  G.stage = "ground battle";
  events.endPhase();
};
export const findNextGroundBattle = (
  G: MyGameState,
  events: EventsAPI
): void => {
  for (let y = G.mapState.currentBattle[1]; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      if (
        y === G.mapState.currentBattle[1] &&
        x <= G.mapState.currentBattle[0]
      ) {
        continue;
      } else if (
        G.mapState.currentTileArray[y][x].type === "land" &&
        G.mapState.battleMap[y][x].length === 1 &&
        G.mapState.buildings[y][x].player &&
        G.mapState.buildings[y][x].player?.id !== G.mapState.battleMap[y][x][0]
      ) {
        const nextPlayer = G.mapState.battleMap[y][x][0];
        G.mapState.currentBattle = [x, y];
        console.log(
          `current ground battle is now ${G.mapState.currentBattle} with player ${nextPlayer} potentially attacking`
        );
        G.stage = "attack or pass";
        events.endTurn({ next: nextPlayer });
        return;
      }
    }
  }
  G.mapState.currentBattle = [0, 0];
  G.stage = "conquest";
  events.endPhase();
};

export const findNextConquest = (G: MyGameState, events: EventsAPI) => {
  for (let y = G.mapState.currentBattle[1]; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      if (
        y === G.mapState.currentBattle[1] &&
        x <= G.mapState.currentBattle[0]
      ) {
        continue;
      } else if (
        G.mapState.currentTileArray[y][x].type === "land" &&
        G.mapState.battleMap[y][x].length === 1 &&
        !G.mapState.buildings[y][x].player
      ) {
        const nextPlayer = G.mapState.battleMap[y][x][0];
        G.mapState.currentBattle = [x, y];
        console.log(
          `current conquest is now ${G.mapState.currentBattle} with player ${nextPlayer} potentially attacking`
        );
        G.stage = "conquest";
        events.endTurn({ next: nextPlayer });
        return;
      }
    }
  }
  G.mapState.currentBattle = [0, 0];
  G.stage = "election";
  events.endPhase();
};

export const findNextPlayerInBattleSequence = (
  playerID: string,
  ctx: Ctx,
  G: MyGameState,
  events: EventsAPI
): void => {
  G.battleState = undefined;
  const playerIDs: string[] = [
    ...G.mapState.battleMap[G.mapState.currentBattle[1]][
      G.mapState.currentBattle[0]
    ],
  ];
  const sortedPlayerIDs = sortPlayersInPlayerOrder(playerIDs, G);
  const currentPlayerIndex = sortPlayersInPlayerOrder(playerIDs, G).indexOf(
    playerID
  );
  const nextPlayerIndex = currentPlayerIndex + 1;
  const nextPlayer = sortedPlayerIDs[nextPlayerIndex];
  console.log(
    `Next player to attack would be player ID at index ${nextPlayerIndex} of the sorted list if they exist, current number of players in this battle is ${sortedPlayerIDs.length}`
  );

  if (
    nextPlayerIndex >= sortedPlayerIDs.length ||
    sortedPlayerIDs.length === 1
  ) {
    console.log("finding next battle...");
    findNextBattle(G, events);
  } else {
    console.log(`next player to attack or pass is ${nextPlayer}`);
    events.endTurn({ next: nextPlayer });
    G.stage = "attack or pass";
  }
};
