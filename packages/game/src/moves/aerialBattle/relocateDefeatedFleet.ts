import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types";
import { isValidRetreatDestination } from "../../helpers/mapUtils";
import { forceRetrieveFleets } from "../../helpers/resolveBattle";
import { nextAfterAerialDecision } from "../../helpers/resolutionSequencer";

const relocateDefeatedFleet: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const destination = args[0];
    const defeatedPlayer = args[1];
    const [x, y] = G.mapState.currentBattle;

    // Special case: [4, 0] means "retreat home" — no valid tiles available
    const isRetreatHome = destination[0] === 4 && destination[1] === 0;

    if (isRetreatHome) {
      forceRetrieveFleets(G, defeatedPlayer, x, y);
    } else {
      // Validate retreat destination per v4.2 rules
      if (
        !isValidRetreatDestination(
          G,
          [x, y] as [number, number],
          destination as [number, number],
          defeatedPlayer
        )
      ) {
        return INVALID_MOVE;
      }

      G.playerInfo[defeatedPlayer].fleetInfo.forEach((fleet) => {
        if (fleet.location[0] === x && fleet.location[1] === y) {
          fleet.location = destination;
          G.mapState.battleMap[y][x].splice(
            G.mapState.battleMap[y][x].indexOf(defeatedPlayer),
            1
          );
          G.mapState.battleMap[destination[1]][destination[0]].push(defeatedPlayer);
        }
      });
    }

    // Advance: next player at this tile, or next tile, or plunder
    nextAfterAerialDecision(G, ctx, events, G.battleState?.attacker.id ?? playerID);
  },
  errorMessage: "Cannot relocate fleet to that destination",
};

export default relocateDefeatedFleet;
