import { MyGameState, MoveError, MoveDefinition } from "../../types";
import {
  addVPAmount,
  advanceAllHeresyTrackers,
  increaseHeresyWithinMove,
  removeVPAmount,
  retreatAllHeresyTrackers,
  logEvent,
} from "../../helpers/stateUtils";
import { INVALID_MOVE } from "boardgame.io/core";
import { blessingOrCurseVPAmount } from "../../helpers/helpers";

const validateIssueHolyDecree = (
  G: MyGameState,
  playerID: string,
  value: string,
  targetID?: string
): MoveError | null => {
  if (!G.playerInfo[playerID].isArchprelate) {
    return { code: "NOT_ARCHPRELATE", message: "Only the Archprelate can issue a Holy Decree" };
  }
  if (G.boardState.issueHolyDecree) {
    return { code: "ALREADY_DECREED", message: "A Holy Decree has already been issued this round" };
  }

  if (value === "curse monarch") {
    const allPlayers = Object.values(G.playerInfo);
    const heretics = allPlayers.filter((p) => p.hereticOrOrthodox === "heretic");
    if (heretics.length > 0) {
      if (G.playerInfo[targetID!]?.hereticOrOrthodox !== "heretic") {
        return { code: "INVALID_CURSE_TARGET", message: "Must curse a Heretic monarch" };
      }
    } else {
      const mostAdvanced = allPlayers
        .filter((p) => p.hereticOrOrthodox === "orthodox")
        .reduce((prev, curr) => (curr.heresyTracker > prev.heresyTracker ? curr : prev));
      if (targetID !== mostAdvanced.id) {
        return { code: "INVALID_CURSE_TARGET", message: "Must curse the most heresy-advanced Orthodox monarch" };
      }
    }
  }

  if (value === "bless monarch") {
    if (G.playerInfo[targetID!]?.hereticOrOrthodox !== "orthodox") {
      return { code: "INVALID_BLESS_TARGET", message: "Can only bless an Orthodox monarch" };
    }
    const leastAdvanced = Object.values(G.playerInfo)
      .filter((p) => p.hereticOrOrthodox === "orthodox")
      .reduce((prev, curr) => (curr.heresyTracker < prev.heresyTracker ? curr : prev));
    if (targetID !== leastAdvanced.id) {
      return { code: "INVALID_BLESS_TARGET", message: "Must bless the least heresy-advanced Orthodox monarch" };
    }
  }

  if (value === "inquisition") {
    if (!targetID || !G.playerInfo[targetID]) {
      return { code: "INVALID_TARGET", message: "Must target a player" };
    }
    if (G.playerInfo[targetID].prisoners <= 0) {
      return { code: "NO_PRISONERS", message: "Target has no imprisoned Dissenters" };
    }
  }

  return null;
};

const issueHolyDecree: MoveDefinition = {
  fn: ({ G, playerID }, ...args: any[]) => {
    const value = args[0];
    const id = args[1];

    if (validateIssueHolyDecree(G, playerID, value, id)) return INVALID_MOVE;

    switch (value) {
      case "reform dogma":
        retreatAllHeresyTrackers(G);
        break;
      case "confirm dogma":
        advanceAllHeresyTrackers(G);
        break;
      case "curse monarch":
        removeVPAmount(G, id, blessingOrCurseVPAmount(G));
        break;
      case "bless monarch":
        addVPAmount(G, id, blessingOrCurseVPAmount(G));
        break;
      case "inquisition": {
        const target = G.playerInfo[id];
        const released = target.prisoners;
        target.prisoners = 0;
        increaseHeresyWithinMove(G, id);
        increaseHeresyWithinMove(G, id);
        logEvent(
          G,
          `Inquisition: ${target.kingdomName} releases ${released} prisoners, heresy advances 2`,
        );
        break;
      }
    }

    G.boardState.issueHolyDecree = true;
    G.playerInfo[playerID].turnComplete = true;
  },
  errorMessage: "Cannot issue a Holy Decree right now",
  validate: validateIssueHolyDecree,
  successLog: (G, pid, decreeType) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} issues Holy Decree: ${decreeType}`;
  },
};

export default issueHolyDecree;
