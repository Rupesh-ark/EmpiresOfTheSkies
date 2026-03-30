import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { increaseHeresyWithinMove, increaseOrthodoxyWithinMove } from "../../helpers/stateUtils";

export const increaseHeresy: Move<MyGameState> = ({ G, playerID }) => {
  increaseHeresyWithinMove(G, playerID);
};

export const increaseOrthodoxy: Move<MyGameState> = ({ G, playerID }) => {
  increaseOrthodoxyWithinMove(G, playerID);
};