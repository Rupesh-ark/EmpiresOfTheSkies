import { MoveDefinition } from "../../types";
import { setStage } from "../../helpers/stageUtils";

const retaliate: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    if (G.battleState) {
      G.battleState.defender = { decision: "fight", ...G.playerInfo[playerID] };
      // Transition to aerial_resolve — attacker draws/picks FoW card first
      setStage(G, "resolution", "aerial_resolve");
      events.endTurn({ next: G.battleState.attacker.id });
    }
  },
  errorMessage: "Cannot retaliate right now",
};

export default retaliate;
