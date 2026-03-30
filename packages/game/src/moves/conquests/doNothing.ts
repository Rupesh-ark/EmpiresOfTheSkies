import { MoveDefinition } from "../../types";
import { nextAfterConquest } from "../../helpers/resolutionSequencer";

const doNothing: MoveDefinition = {
  fn: ({ G, events }) => {
    nextAfterConquest(G, events);
  },
  errorMessage: "Cannot pass on conquest right now",
};

export default doNothing;
