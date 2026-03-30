import { MoveDefinition } from "../../types";
import { nextAfterPlunder } from "../../helpers/resolutionSequencer";

const doNotPlunder: MoveDefinition = {
  fn: ({ G, events }) => {
    nextAfterPlunder(G, events);
  },
  errorMessage: "Cannot pass on plundering right now",
};

export default doNotPlunder;
