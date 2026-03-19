import { MoveDefinition } from "../../types";

const evadeAttackingFleet: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    if (G.battleState !== undefined) {
      G.battleState.defender = { decision: "evade", ...G.playerInfo[playerID] };
      const attackerID = G.battleState.attacker.id;
      G.stage = "relocate loser";
      events.endTurn({ next: attackerID });
    }
  },
  errorMessage: "Cannot evade right now",
};

export default evadeAttackingFleet;
