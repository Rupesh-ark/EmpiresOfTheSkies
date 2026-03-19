import { MoveDefinition } from "../../types";
import { findNextGroundBattle } from "../../helpers/findNext";

const doNotGroundAttack: MoveDefinition = {
  fn: ({ G, events }, ...args) => {
    findNextGroundBattle(G, events);
  },
  errorMessage: "Cannot pass on ground attack right now",
};

export default doNotGroundAttack;
