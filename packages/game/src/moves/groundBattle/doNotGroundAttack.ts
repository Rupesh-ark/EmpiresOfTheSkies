import { MoveDefinition } from "../../types.js";
import { nextAfterGroundDecision } from "../../helpers/resolutionSequencer.js";

const doNotGroundAttack: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }) => {
    nextAfterGroundDecision(G, ctx, events, playerID);
  },
  errorMessage: "Cannot pass on ground attack right now",
};

export default doNotGroundAttack;
