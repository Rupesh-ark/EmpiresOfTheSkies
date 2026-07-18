import { MoveDefinition } from "../../types.js";
import { nextAfterAerialDecision } from "../../helpers/resolutionSequencer.js";

const doNotAttack: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }) => {
    nextAfterAerialDecision(G, ctx, events, playerID);
  },
  errorMessage: "Cannot pass on attacking right now",
};

export default doNotAttack;
