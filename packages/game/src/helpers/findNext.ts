import { MyGameState } from "../types";
import { sortPlayersInPlayerOrder } from "./helpers";
import { EventsAPI } from "boardgame.io/dist/types/src/plugins/events/events";
import { setStage } from "./stageUtils";

const computeDefendersAtBattle = (G: MyGameState, nextPlayer: string): void => {
  const [x, y] = G.mapState.currentBattle;
  G.possibleDefenders = (G.mapState.battleMap[y]?.[x] ?? []).filter(
    (id) => id !== nextPlayer
  );
};

export const findNextBattle = (
  G: MyGameState,
  events: EventsAPI,
  skipEndTurn = false,
  onExhausted?: (G: MyGameState, events: EventsAPI) => void
) => {
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
        setStage(G, "resolution", "aerial_attack_or_pass");
        computeDefendersAtBattle(G, nextPlayer);
        if (!skipEndTurn) events.endTurn({ next: nextPlayer });
        return;
      }
    }
  }
  G.mapState.currentBattle = [0, 0];
  if (onExhausted) {
    onExhausted(G, events);
  } else {
    events.endPhase();
  }
};

export const findNextPlunder = (
  G: MyGameState,
  events: EventsAPI,
  onExhausted?: (G: MyGameState, events: EventsAPI) => void
): void => {
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
        setStage(G, "resolution", "plunder_legends");
        events.endTurn({ next: nextPlayer });
        return;
      }
    }
  }
  G.mapState.currentBattle = [0, 0];
  if (onExhausted) {
    onExhausted(G, events);
  } else {
    events.endPhase();
  }
};
export const findNextGroundBattle = (
  G: MyGameState,
  events: EventsAPI,
  onExhausted?: (G: MyGameState, events: EventsAPI) => void
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
        setStage(G, "resolution", "ground_attack_or_pass");
        computeDefendersAtBattle(G, nextPlayer);
        events.endTurn({ next: nextPlayer });
        return;
      }
    }
  }
  G.mapState.currentBattle = [0, 0];
  if (onExhausted) {
    onExhausted(G, events);
  } else {
    events.endPhase();
  }
};

export const findNextConquest = (
  G: MyGameState,
  events: EventsAPI,
  onExhausted?: (G: MyGameState, events: EventsAPI) => void
) => {
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
        (
          !G.mapState.buildings[y][x].player ||
          (G.mapState.buildings[y][x].player?.id === G.mapState.battleMap[y][x][0] &&
           G.mapState.buildings[y][x].buildings === "outpost")
        )
      ) {
        const nextPlayer = G.mapState.battleMap[y][x][0];
        G.mapState.currentBattle = [x, y];
        setStage(G, "resolution", "conquest");
        events.endTurn({ next: nextPlayer });
        return;
      }
    }
  }
  G.mapState.currentBattle = [0, 0];
  if (onExhausted) {
    onExhausted(G, events);
  } else {
    events.endPhase();
  }
};

