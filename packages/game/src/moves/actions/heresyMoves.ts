import { MoveDefinition } from "../../types";
import { increaseHeresyWithinMove, increaseOrthodoxyWithinMove } from "../../helpers/stateUtils";

export const increaseHeresy: MoveDefinition = {
  fn: ({ G, playerID }) => {
    increaseHeresyWithinMove(G, playerID);
  },
  errorMessage: "Cannot increase heresy right now",
};

export const increaseOrthodoxy: MoveDefinition = {
  fn: ({ G, playerID }) => {
    increaseOrthodoxyWithinMove(G, playerID);
  },
  errorMessage: "Cannot increase orthodoxy right now",
};
