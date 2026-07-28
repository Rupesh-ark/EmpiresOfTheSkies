import { MoveDefinition } from "../../types.js";
import { forceRetrieveFleets } from "../../helpers/resolveBattle.js";
import { nextAfterAerialDecision } from "../../helpers/resolutionSequencer.js";
import { clonePlayerInfo } from "../../helpers/cloneUtils.js";
import { computeRetreatDestinations } from "../../helpers/mapUtils.js";
import log from "../../helpers/logger.js";

const evadeAttackingFleet: MoveDefinition = {
  validate: (G, playerID) => {
    if (!G.battleState) {
      return { code: "NO_BATTLE", message: "No active battle" };
    }
    if (G.battleState.defender?.id !== playerID) {
      return { code: "NOT_DEFENDER", message: "Only the defender can evade" };
    }
    const sub = G.step;
    if (sub !== "aerial_attack_or_evade") {
      return { code: "WRONG_STAGE", message: "Cannot evade in this stage" };
    }
    return null;
  },
  fn: ({ G, ctx, playerID, events }, ...args) => {
    if (G.battleState !== undefined) {
      G.battleState.defender = { decision: "evade", ...clonePlayerInfo(G.playerInfo[playerID]) };
      const attackerID = G.battleState.attacker.id;

      // Compute valid relocation tiles for the evading fleet
      try {
        G.validRelocationTiles = computeRetreatDestinations(
          G,
          [
            G.mapState.currentBattle[0],
            G.mapState.currentBattle[1],
          ],
          playerID
        );
      } catch (err) {
        log.warn({ err, battle: G.mapState.currentBattle }, "Failed to find possible destinations for evading fleet");
        G.validRelocationTiles = [];
      }

      if (G.validRelocationTiles.length === 0) {
        // No valid relocation tiles — evading fleet forced home
        const [bx, by] = G.mapState.currentBattle;
        forceRetrieveFleets(G, playerID, bx, by);
        nextAfterAerialDecision(G, ctx, events, attackerID);
      } else {
        G.step = "relocate_loser";
        events.endTurn({ next: attackerID });
      }
    }
  },
  errorMessage: "Cannot evade right now",
  successLog: (G, pid) => {
    const k = G.playerInfo[pid].kingdomName;
    return `${k} evades the attack`;
  },
};

export default evadeAttackingFleet;
