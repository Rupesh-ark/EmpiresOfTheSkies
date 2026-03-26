import { MoveDefinition } from "../../types";
import { setStage } from "../../helpers/stageUtils";

const defendGroundAttack: MoveDefinition = {
  fn: ({ G, events }, ...args) => {
    if (G.battleState) {
      G.battleState.defender.decision = "fight";
      setStage(G, "resolution", "ground_resolve");
      events.endTurn({ next: G.battleState.attacker.id });
    }
  },
  errorMessage: "Cannot defend right now",
};

export default defendGroundAttack;
