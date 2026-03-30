import { Move } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core/";
import { MyGameState } from "../../types";

const coloniseLand: Move<MyGameState> = ({ G, playerID }) => {
  const [x, y] = G.mapState.currentBattle;
  const currentBuilding = G.mapState.buildings[y][x];

  // GAP-15 sub-rule 1: if another player owns a building here, the attacker must
  // first take ownership via constructOutpost before attempting colonisation.
  if (currentBuilding.player && currentBuilding.player.id !== playerID) {
    return INVALID_MOVE;
  }

  // GAP-15 sub-rule 3: a player who failed a conquest at this tile this round
  // cannot attempt it again until the next round.
  const alreadyFailed = G.failedConquests.some(
    (f) => f.playerId === playerID && f.tile[0] === x && f.tile[1] === y
  );
  if (alreadyFailed) {
    return INVALID_MOVE;
  }

  G.conquestState = {
    decision: "fight",
    ...G.playerInfo[playerID],
  };
  G.stage = "conquest draw or pick card";
};

export default coloniseLand;