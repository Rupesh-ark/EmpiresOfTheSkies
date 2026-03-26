import { MoveDefinition } from "../../types";
import { findPossibleDestinations } from "../../helpers/helpers";
import { findNextPlayerInBattleSequence } from "../../helpers/findNext";
import { forceRetrieveFleets } from "../../helpers/resolveBattle";
import { setStage } from "../../helpers/stageUtils";

const evadeAttackingFleet: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    if (G.battleState !== undefined) {
      G.battleState.defender = { decision: "evade", ...G.playerInfo[playerID] };
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
      } catch {
        G.validRelocationTiles = [];
      }

      if (G.validRelocationTiles.length === 0) {
        // No valid relocation tiles — evading fleet forced home
        const [bx, by] = G.mapState.currentBattle;
        forceRetrieveFleets(G, playerID, bx, by);
        findNextPlayerInBattleSequence(attackerID, ctx, G, events);
      } else {
        setStage(G, "resolution", "aerial_relocate");
        events.endTurn({ next: attackerID });
      }
    }
  },
  errorMessage: "Cannot evade right now",
};

export default evadeAttackingFleet;
