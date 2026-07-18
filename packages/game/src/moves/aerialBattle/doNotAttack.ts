import { MoveDefinition } from "../../types.js";
import { nextAfterAerialDecision } from "../../helpers/resolutionSequencer.js";

const doNotAttack: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }) => {
    nextAfterAerialDecision(G, ctx, events, playerID);
  },
  errorMessage: "Cannot pass on attacking right now",
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} declines to attack`;
  },
};

export default doNotAttack;
