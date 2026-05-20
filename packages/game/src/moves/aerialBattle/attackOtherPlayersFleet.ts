import { MoveDefinition } from "../../types";
import { removeVPAmount, logEvent } from "../../helpers/stateUtils";
import { setStage } from "../../helpers/stageUtils";
import { clonePlayerInfo } from "../../helpers/cloneUtils";

const attackOtherPlayersFleet: MoveDefinition = {
  validate: (G, playerID, ...args) => {
    const defenderID = args[0];
    const [x, y] = G.mapState.currentBattle;
    const playersAtTile = G.mapState.battleMap[y]?.[x] ?? [];
    if (!defenderID || defenderID === playerID) {
      return { code: "INVALID_TARGET", message: "Cannot attack yourself" };
    }
    if (!playersAtTile.includes(defenderID)) {
      return { code: "INVALID_TARGET", message: "Defender is not at this battle tile" };
    }
    return null;
  },
  fn: ({ G, playerID, events }, ...args) => {
    const defenderID: string = args[0];
    const attackerName = G.playerInfo[playerID].kingdomName;
    const defenderName = G.playerInfo[defenderID].kingdomName;

    // Peace Accord: first attacker loses 3 VP and nullifies the accord
    if (G.eventState.peaceAccordActive) {
      removeVPAmount(G, playerID, 3);
      G.eventState.peaceAccordActive = false;
    }

    // Dynastic Marriage: attacking your marriage partner ends the alliance
    if (G.eventState.dynasticMarriage) {
      const [p1, p2] = G.eventState.dynasticMarriage;
      if (
        (playerID === p1 && defenderID === p2) ||
        (playerID === p2 && defenderID === p1)
      ) {
        G.eventState.dynasticMarriage = null;
      }
    }

    logEvent(G, `${attackerName} attacks ${defenderName}'s fleet`);

    G.battleState = {
      attacker: { decision: "fight", ...clonePlayerInfo(G.playerInfo[playerID]) },
      defender: { decision: "undecided", ...clonePlayerInfo(G.playerInfo[defenderID]) },
    };
    events.endTurn({ next: defenderID });
    setStage(G, "resolution", "aerial_attack_or_evade");
  },
  errorMessage: "Cannot attack this fleet",
  successLog: (G, pid, defenderID) => {
    const k = G.playerInfo[pid].kingdomName;
    const d = G.playerInfo[defenderID].kingdomName;
    return `${k} attacks ${d}'s fleet`;
  },
};

export default attackOtherPlayersFleet;
