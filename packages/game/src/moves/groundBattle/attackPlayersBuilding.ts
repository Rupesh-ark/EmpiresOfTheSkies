import { MoveDefinition } from "../../types.js";
import { removeVPAmount, logEvent } from "../../helpers/stateUtils.js";
import { clonePlayerInfo } from "../../helpers/cloneUtils.js";

const attackPlayersBuilding: MoveDefinition = {
  validate: (G, playerID) => {
    if (!G.mapState.currentBattle || G.mapState.currentBattle.length < 2) {
      return { code: "NO_BATTLE", message: "No active battle location" };
    }
    const [x, y] = G.mapState.currentBattle;
    const defender = G.mapState.buildings[y]?.[x]?.player;
    if (!defender) {
      return { code: "NO_BUILDING", message: "No building to attack at this location" };
    }
    if (defender.id === playerID) {
      return { code: "SELF_ATTACK", message: "Cannot attack your own building" };
    }
    const sub = G.step;
    if (sub !== "ground_attack_or_pass") {
      return { code: "WRONG_STAGE", message: "Cannot attack building in this stage" };
    }
    return null;
  },
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

      logEvent(G, `${attackerName} attacks ${defenderName}'s building`);

      G.battleState = {
        attacker: { decision: "fight", ...clonePlayerInfo(G.playerInfo[playerID]) },
        defender: { decision: "undecided", ...clonePlayerInfo(G.playerInfo[defender.id]) },
      };
      events.endTurn({ next: defender.id });
      G.step = "ground_defend_or_yield";
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
