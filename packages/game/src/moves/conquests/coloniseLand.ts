import { INVALID_MOVE } from "boardgame.io/core/";
import { MoveDefinition } from "../../types";
import { setStage } from "../../helpers/stageUtils";
import { logEvent } from "../../helpers/stateUtils";

const coloniseLand: MoveDefinition = {
  fn: ({ G, playerID }) => {
    const [x, y] = G.mapState.currentBattle;
    const currentBuilding = G.mapState.buildings[y][x];

    if (currentBuilding.player && currentBuilding.player.id !== playerID) {
      return INVALID_MOVE;
    }

    const alreadyFailed = G.failedConquests.some(
      (f) => f.playerId === playerID && f.tile[0] === x && f.tile[1] === y
    );
    if (alreadyFailed) {
      return INVALID_MOVE;
    }

    logEvent(G, `${G.playerInfo[playerID].kingdomName} attempts to colonise [${x},${y}]`);

    G.conquestState = {
      decision: "fight",
      ...G.playerInfo[playerID],
    };
    setStage(G, "resolution", "conquest_draw_or_pick");
  },
  errorMessage: "Cannot colonise this land",
  successLog: (G, pid) => {
    const [x, y] = G.mapState.currentBattle;
    const landName = G.mapState.currentTileArray[y][x]?.name ?? `[${x},${y}]`;
    const k = G.playerInfo[pid].kingdomName;
    return `${k} attempts to colonise ${landName}`;
  },
};

export default coloniseLand;
