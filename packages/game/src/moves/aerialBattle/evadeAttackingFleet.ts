import { MoveDefinition } from "../../types.js";
import { findPossibleDestinations } from "../../helpers/helpers.js";
import { forceRetrieveFleets } from "../../helpers/resolveBattle.js";
import { setStage } from "../../helpers/stageUtils.js";
import { nextAfterAerialDecision } from "../../helpers/resolutionSequencer.js";
import { clonePlayerInfo } from "../../helpers/cloneUtils.js";
import log from "../../helpers/logger.js";

const evadeAttackingFleet: MoveDefinition = {
  validate: (G, playerID) => {
    if (!G.battleState) {
      return { code: "NO_BATTLE", message: "No active battle" };
    }
    if (G.battleState.defender?.id !== playerID) {
      return { code: "NOT_DEFENDER", message: "Only the defender can evade" };
    }
    const sub = G.stage.sub;
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
        const possibleTiles = findPossibleDestinations(G, G.mapState.currentBattle, true);
        const emptyTiles: number[][] = [];
        for (let i = 1; i < possibleTiles.length; i++) {
          possibleTiles[i].forEach((tile) => {
            if (emptyTiles.length === 0 || i === 1) {
              if (G.mapState.battleMap[tile[1]]?.[tile[0]]?.length === 0) {
                emptyTiles.push(tile);
              }
            }
          });
        }
        G.validRelocationTiles = emptyTiles;
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
        setStage(G, "resolution", "relocate_loser");
        events.endTurn({ next: attackerID });
      }
    }
  },
  errorMessage: "Cannot evade right now",
};

export default evadeAttackingFleet;
