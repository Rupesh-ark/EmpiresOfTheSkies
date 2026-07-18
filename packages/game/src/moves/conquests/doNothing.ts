import { MoveDefinition } from "../../types.js";
import { nextAfterConquest } from "../../helpers/resolutionSequencer.js";

const doNothing: MoveDefinition = {
  fn: ({ G, events }) => {
    nextAfterConquest(G, events);
  },
  errorMessage: "Cannot pass on conquest right now",
};

export default doNothing;
