import { MoveDefinition } from "../../types";

const retaliate: MoveDefinition = {
  fn: ({ G, playerID }, ...args) => {
    if (G.battleState) {
      G.battleState.defender = { decision: "fight", ...G.playerInfo[playerID] };
    }
  },
  errorMessage: "Cannot retaliate right now",
};

export default retaliate;
