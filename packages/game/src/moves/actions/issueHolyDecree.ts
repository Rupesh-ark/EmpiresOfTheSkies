import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import {
  addVPAmount,
  advanceAllHeresyTrackers,
  removeVPAmount,
  retreatAllHeresyTrackers,
} from "../../helpers/stateUtils";
import { INVALID_MOVE } from "boardgame.io/core";
import { blessingOrCurseVPAmount } from "../../helpers/helpers";
const issueHolyDecree: Move<MyGameState> = (
  { G, playerID },
  ...args: any[]
) => {
  const value = args[0];
  const id = args[1];
  if (!G.playerInfo[playerID].isArchprelate) {
    return INVALID_MOVE;
  }
  if (G.boardState.issueHolyDecree) {
    return INVALID_MOVE;
  }

  switch (value) {
    case "reform dogma":
      retreatAllHeresyTrackers(G);
      break;
    case "confirm dogma":
      advanceAllHeresyTrackers(G);
      break;

    case "curse monarch": {
      // GAP-19: must target a Heretic; if none exist, target most heresy-advanced Orthodox
      const allPlayers = Object.values(G.playerInfo);
      const heretics = allPlayers.filter((p) => p.hereticOrOrthodox === "heretic");
      if (heretics.length > 0) {
        if (G.playerInfo[id]?.hereticOrOrthodox !== "heretic") return INVALID_MOVE;
      } else {
        const mostAdvanced = allPlayers
          .filter((p) => p.hereticOrOrthodox === "orthodox")
          .reduce((prev, curr) => (curr.heresyTracker > prev.heresyTracker ? curr : prev));
        if (id !== mostAdvanced.id) return INVALID_MOVE;
      }
      removeVPAmount(G, id, blessingOrCurseVPAmount(G));
      break;
    }
    case "bless monarch": {
      // GAP-19: must target the least-advanced Orthodox (lowest heresyTracker among Orthodox)
      if (G.playerInfo[id]?.hereticOrOrthodox !== "orthodox") return INVALID_MOVE;
      const leastAdvanced = Object.values(G.playerInfo)
        .filter((p) => p.hereticOrOrthodox === "orthodox")
        .reduce((prev, curr) => (curr.heresyTracker < prev.heresyTracker ? curr : prev));
      if (id !== leastAdvanced.id) return INVALID_MOVE;
      addVPAmount(G, id, blessingOrCurseVPAmount(G));
      break;
    }
  }

  G.boardState.issueHolyDecree = true;
  G.playerInfo[playerID].turnComplete = true;
};

export default issueHolyDecree;
