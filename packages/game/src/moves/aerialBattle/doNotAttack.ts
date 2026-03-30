import { MoveDefinition } from "../../types";
import { nextAfterAerialDecision } from "../../helpers/resolutionSequencer";

const doNotAttack: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }) => {
    nextAfterAerialDecision(G, ctx, events, playerID);
  },
  errorMessage: "Cannot pass on attacking right now",
};

export default doNotAttack;
