import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { INVALID_MOVE } from "boardgame.io/core";

const checkAndPlaceFort: Move<MyGameState> = (
  { G, playerID }: { G: MyGameState; playerID: string },
  coords: [number, number]
) => {
  const [x, y] = coords;
  const tileInfo = G.mapState.buildings[y][x];
  if (tileInfo === undefined) {
    return INVALID_MOVE;
  }
  let hasRelevantPresence = false;
  if (tileInfo.player) {
    if (
      tileInfo.player.id === playerID &&
      (tileInfo.buildings === "colony" || tileInfo.buildings === "outpost") &&
      tileInfo.fort === false &&
      tileInfo.garrisonedRegiments
        ? tileInfo.garrisonedRegiments > 0
        : false
    ) {
      hasRelevantPresence = true;
    }
  }

  if (!hasRelevantPresence) {
    return INVALID_MOVE;
  }

  tileInfo.fort = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default checkAndPlaceFort;