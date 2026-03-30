import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

import { addLevyAmount, addRegiments } from "../resourceUpdates";
import { findNextGroundBattle } from "../../helpers/findNext";

const yieldToAttacker: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const [x, y] = G.mapState.currentBattle;
  if (G.battleState) {
    const currentBuilding = G.mapState.buildings[y][x];
    currentBuilding.player &&
      addRegiments(
        G,
        currentBuilding.player.id,
        currentBuilding.garrisonedRegiments ?? 0
      );

    currentBuilding.player &&
      addLevyAmount(
        G,
        currentBuilding.player.id,
        currentBuilding.garrisonedLevies ?? 0
      );

    currentBuilding.garrisonedRegiments = 0;
    currentBuilding.garrisonedLevies = 0;
    currentBuilding.player = G.playerInfo[G.battleState.attacker.id];
  }
  G.battleState = undefined;

  findNextGroundBattle(G, events);
};

export default yieldToAttacker;
