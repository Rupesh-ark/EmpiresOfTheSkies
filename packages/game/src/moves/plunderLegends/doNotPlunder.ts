import { MoveDefinition } from "../../types";
import { findNextPlunder } from "../../helpers/findNext";

const doNotPlunder: MoveDefinition = {
  fn: ({ G, events }, ...args) => {
    findNextPlunder(G, events);
  },
  errorMessage: "Cannot pass on plundering right now",
};

export default doNotPlunder;
