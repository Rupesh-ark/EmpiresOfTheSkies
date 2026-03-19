import { MoveDefinition } from "../../types";
import { addEliteRegiments, addLevyAmount, addRegiments } from "../../helpers/stateUtils";
import { findNextGroundBattle } from "../../helpers/findNext";

const yieldToAttacker: MoveDefinition = {
  fn: ({ G, events }, ...args) => {
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

      currentBuilding.player &&
        addEliteRegiments(
          G,
          currentBuilding.player.id,
          currentBuilding.garrisonedEliteRegiments ?? 0
        );

      currentBuilding.garrisonedRegiments = 0;
      currentBuilding.garrisonedLevies = 0;
      currentBuilding.garrisonedEliteRegiments = 0;
      currentBuilding.player = G.playerInfo[G.battleState.attacker.id];
    }
    G.battleState = undefined;

    findNextGroundBattle(G, events);
  },
  errorMessage: "Cannot yield right now",
};

export default yieldToAttacker;
