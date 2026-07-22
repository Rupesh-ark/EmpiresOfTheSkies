import { MoveDefinition } from "../../types.js";

const defendGroundAttack: MoveDefinition = {
  fn: ({ G, events }, ...args) => {
    if (G.battleState) {
      G.battleState.defender.decision = "fight";
      G.step = "ground_resolve";
      events.endTurn({ next: G.battleState.attacker.id });
    }
  },
  errorMessage: "Cannot defend right now",
};

export default defendGroundAttack;
