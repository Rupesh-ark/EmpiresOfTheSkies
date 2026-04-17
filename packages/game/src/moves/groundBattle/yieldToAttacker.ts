import { MoveDefinition } from "../../types";
import { addEliteRegiments, addLevyAmount, addRegiments } from "../../helpers/stateUtils";
import { nextAfterGroundDecision } from "../../helpers/resolutionSequencer";

const yieldToAttacker: MoveDefinition = {
  validate: (G, playerID) => {
    if (!G.battleState) {
      return { code: "NO_BATTLE", message: "No active battle" };
    }
    if (G.battleState.defender?.id !== playerID) {
      return { code: "NOT_DEFENDER", message: "Only the defender can yield" };
    }
    const sub = G.stage.sub;
    if (sub !== "ground_defend_or_yield") {
      return { code: "WRONG_STAGE", message: "Cannot yield in this stage" };
    }
    return null;
  },
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const [x, y] = G.mapState.currentBattle;
    let attackerId: string | undefined;
    if (G.battleState) {
      attackerId = G.battleState.attacker.id;
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

    nextAfterGroundDecision(G, ctx, events, attackerId ?? playerID);
  },
  errorMessage: "Cannot yield right now",
};

export default yieldToAttacker;
