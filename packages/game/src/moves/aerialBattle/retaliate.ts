import { MoveDefinition } from "../../types.js";
import { clonePlayerInfo } from "../../helpers/cloneUtils.js";

const retaliate: MoveDefinition = {
  validate: (G, playerID) => {
    if (!G.battleState) {
      return { code: "NO_BATTLE", message: "No active battle" };
    }
    if (G.battleState.defender?.id !== playerID) {
      return { code: "NOT_DEFENDER", message: "Only the defender can retaliate" };
    }
    const sub = G.step;
    if (sub !== "aerial_attack_or_evade") {
      return { code: "WRONG_STAGE", message: "Cannot retaliate in this stage" };
    }
    return null;
  },
  fn: ({ G, playerID, events }, ...args) => {
    if (G.battleState) {
      G.battleState.defender = { decision: "fight", ...clonePlayerInfo(G.playerInfo[playerID]) };
      // Transition to aerial_resolve — attacker draws/picks FoW card first
      G.step = "aerial_resolve";
      events.endTurn({ next: G.battleState.attacker.id });
    }
  },
  errorMessage: "Cannot retaliate right now",
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} stands and fights!`;
  },
};

export default retaliate;
