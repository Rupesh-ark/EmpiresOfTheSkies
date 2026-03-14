import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { removeVPAmount } from "../../helpers/stateUtils";

const attackPlayersBuilding: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const [x, y] = G.mapState.currentBattle;
  const defender = G.mapState.buildings[y][x].player;
  if (defender) {
    // Peace Accord: first attacker loses 3 VP and nullifies the accord
    if (G.eventState.peaceAccordActive) {
      removeVPAmount(G, playerID, 3);
      G.eventState.peaceAccordActive = false;
    }

    // Dynastic Marriage: attacking your marriage partner ends the alliance
    if (G.eventState.dynasticMarriage) {
      const [p1, p2] = G.eventState.dynasticMarriage;
      if (
        (playerID === p1 && defender.id === p2) ||
        (playerID === p2 && defender.id === p1)
      ) {
        G.eventState.dynasticMarriage = null;
      }
    }

    G.battleState = {
      attacker: { decision: "fight", ...G.playerInfo[playerID] },
      defender: { decision: "undecided", ...G.playerInfo[defender.id] },
    };
    events.endTurn({ next: defender.id });
    G.stage = "defend or yield";
  }
};

export default attackPlayersBuilding;
