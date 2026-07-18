import { MoveDefinition } from "../../types.js";
import { nextAfterPlunder } from "../../helpers/resolutionSequencer.js";

const doNotPlunder: MoveDefinition = {
  fn: ({ G, events }) => {
    nextAfterPlunder(G, events);
  },
  errorMessage: "Cannot pass on plundering right now",
};

export default doNotPlunder;
