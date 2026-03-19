import { MoveDefinition } from "../../types";
import { findNextConquest } from "../../helpers/findNext";

const doNothing: MoveDefinition = {
  fn: ({ G, events }, ...args) => {
    findNextConquest(G, events);
  },
  errorMessage: "Cannot pass on conquest right now",
};

export default doNothing;
