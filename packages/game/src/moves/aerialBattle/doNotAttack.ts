import { MoveDefinition } from "../../types";
import {
  findNextBattle,
  findNextPlayerInBattleSequence,
} from "../../helpers/findNext";

const doNotAttack: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const [x, y] = G.mapState.currentBattle;
    const possibleBattlers = G.mapState.battleMap[y][x];
    let currentPlayerIndex: number = 0;
    for (let i = 0; i < possibleBattlers.length; i++) {
      if (possibleBattlers[i] === playerID) {
        currentPlayerIndex = i;
      }
    }
    if (currentPlayerIndex === possibleBattlers.length - 1) {
      findNextBattle(G, events);
    } else {
      findNextPlayerInBattleSequence(playerID, ctx, G, events);
    }
  },
  errorMessage: "Cannot pass on attacking right now",
};

export default doNotAttack;
