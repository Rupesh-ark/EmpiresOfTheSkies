import { MoveDefinition } from "../../types.js";
import { removeVPAmount } from "../../helpers/stateUtils.js";
import { clonePlayerInfo } from "../../helpers/cloneUtils.js";

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
    // Rulebook: after an evasion the attacker must challenge ANOTHER player.
    const challenges = G.aerialChallenges;
    if (
      challenges &&
      challenges.tile[0] === x &&
      challenges.tile[1] === y &&
      challenges.pairs.includes(`${playerID}>${defenderID}`)
    ) {
      const defenderName = G.playerInfo[defenderID]?.kingdomName ?? "that player";
      return {
        code: "ALREADY_CHALLENGED",
        message: `You have already challenged ${defenderName} in this battle — challenge another player`,
      };
    }
    return null;
  },
  fn: ({ G, playerID, events }, ...args) => {
    const defenderID: string = args[0];

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

    const [bx, by] = G.mapState.currentBattle;
    if (
      !G.aerialChallenges ||
      G.aerialChallenges.tile[0] !== bx ||
      G.aerialChallenges.tile[1] !== by
    ) {
      G.aerialChallenges = { tile: [bx, by], pairs: [] };
    }
    G.aerialChallenges.pairs.push(`${playerID}>${defenderID}`);

    G.battleState = {
      attacker: { decision: "fight", ...clonePlayerInfo(G.playerInfo[playerID]) },
      defender: { decision: "undecided", ...clonePlayerInfo(G.playerInfo[defenderID]) },
    };
    events.endTurn({ next: defenderID });
    G.step = "aerial_attack_or_evade";
  },
  errorMessage: "Cannot attack this fleet",
  successLog: (G, pid, defenderID) => {
    const k = G.playerInfo[pid].kingdomName;
    const d = G.playerInfo[defenderID].kingdomName;
    return `${k} attacks ${d}'s fleet`;
  },
};

export default attackOtherPlayersFleet;
