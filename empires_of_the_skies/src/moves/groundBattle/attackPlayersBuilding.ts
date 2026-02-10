import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

const attackPlayersBuilding: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const [x, y] = G.mapState.currentBattle;
  const defender = G.mapState.buildings[y][x].player;
  if (defender) {
    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo[playerID] },
      defender: { decision: "undecided", ...G.playerInfo[defender.id] },
    };
    events.endTurn({ next: defender.id });
    G.stage = "defend or yield";
  }
};

export default attackPlayersBuilding;
