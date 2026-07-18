import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types.js";
import { isValidRetreatDestination } from "../../helpers/mapUtils.js";
import { forceRetrieveFleets } from "../../helpers/resolveBattle.js";
import { nextAfterAerialDecision } from "../../helpers/resolutionSequencer.js";

const relocateDefeatedFleet: MoveDefinition = {
  validate: (G, playerID, ...args) => {
    const defeatedPlayer = args[1];
    if (!defeatedPlayer || typeof defeatedPlayer !== "string") {
      return { code: "INVALID_PLAYER", message: "Invalid defeated player" };
    }
    if (!G.playerInfo[defeatedPlayer]) {
      return { code: "INVALID_PLAYER", message: "Defeated player does not exist" };
    }
    if (!G.battleState) {
      return { code: "NO_BATTLE", message: "No active battle" };
    }
    const sub = G.stage.sub;
    if (sub !== "relocate_loser") {
      return { code: "WRONG_STAGE", message: "Cannot relocate fleet in this stage" };
    }
    return null;
  },
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const destination = args[0];
    const defeatedPlayer = args[1];
    const [x, y] = G.mapState.currentBattle;

    // Special case: [4, 0] means "retreat home" — no valid tiles available
    const isRetreatHome = destination[0] === 4 && destination[1] === 0;

    if (isRetreatHome) {
      forceRetrieveFleets(G, defeatedPlayer, x, y);
    } else {
      // Validate retreat destination
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
  successLog: (G, _pid, destination, defeatedPlayer) => {
    const k = G.playerInfo[defeatedPlayer]?.kingdomName ?? "A fleet";
    const [dx, dy] = destination ?? [];
    if (dx === 4 && dy === 0) return `${k}'s fleet retreats home`;
    return `${k}'s fleet withdraws to [${dx}, ${dy}]`;
  },
};

export default relocateDefeatedFleet;
