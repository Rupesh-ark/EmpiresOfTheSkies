import { MoveDefinition } from "../../types";
import { removeVPAmount } from "../../helpers/stateUtils";
import { setStage } from "../../helpers/stageUtils";
import { logBattleEvent } from "../../helpers/logger";

const attackPlayersBuilding: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    const [x, y] = G.mapState.currentBattle;
    const defender = G.mapState.buildings[y][x].player;
    if (defender) {
      const attackerName = G.playerInfo[playerID].kingdomName;
      const defenderName = G.playerInfo[defender.id].kingdomName;

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

      logBattleEvent(attackerName, defenderName, "GROUND", "initiated");

      G.battleState = {
        attacker: { decision: "fight", ...G.playerInfo[playerID] },
        defender: { decision: "undecided", ...G.playerInfo[defender.id] },
      };
      events.endTurn({ next: defender.id });
      setStage(G, "resolution", "ground_defend_or_yield");
    }
  },
  errorMessage: "Cannot attack this building",
  successLog: (G, pid) => {
    const [x, y] = G.mapState.currentBattle;
    const defender = G.mapState.buildings[y][x].player;
    if (!defender) return null;
    const k = G.playerInfo[pid].kingdomName;
    const d = G.playerInfo[defender.id].kingdomName;
    return `${k} attacks ${d}'s ${G.mapState.buildings[y][x].buildings}`;
  },
};

export default attackPlayersBuilding;
