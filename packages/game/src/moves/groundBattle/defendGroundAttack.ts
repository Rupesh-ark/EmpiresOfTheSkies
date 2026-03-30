import { MoveDefinition } from "../../types";

const defendGroundAttack: MoveDefinition = {
  fn: ({ G, events }, ...args) => {
    if (G.battleState) {
      G.battleState.defender.decision = "fight";
      G.stage = "resolve battle";
      events.endTurn({ next: G.battleState.attacker.id });
    }
  },
  errorMessage: "Cannot defend right now",
};

export default defendGroundAttack;
