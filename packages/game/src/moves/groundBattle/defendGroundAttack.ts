import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

const defendGroundAttack: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  if (G.battleState) {
    G.battleState.defender.decision = "fight";
    G.stage = "resolve battle";
    events.endTurn({ next: G.battleState.attacker.id });
  }
};

export default defendGroundAttack;
