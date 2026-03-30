import { MoveDefinition } from "../../types";
import { nextAfterGroundDecision } from "../../helpers/resolutionSequencer";

const doNotGroundAttack: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }) => {
    nextAfterGroundDecision(G, ctx, events, playerID);
  },
  errorMessage: "Cannot pass on ground attack right now",
};

export default doNotGroundAttack;
