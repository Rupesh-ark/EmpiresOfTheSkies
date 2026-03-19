import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types";
import { findNextPlayerInBattleSequence } from "../../helpers/findNext";
import { isValidRetreatDestination } from "../../helpers/mapUtils";

const relocateDefeatedFleet: MoveDefinition = {
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const destination = args[0];
    const defeatedPlayer = args[1];
    const [x, y] = G.mapState.currentBattle;

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
    if (
      G.battleState?.defender.decision !== "evade" ||
      G.mapState.battleMap[y][x].length === 1
    ) {
      findNextPlayerInBattleSequence(
        G.battleState?.attacker.id ?? playerID,
        ctx,
        G,
        events
      );
    } else {
      G.battleState = undefined;
      G.stage = "attack or pass";
    }
  },
  errorMessage: "Cannot relocate fleet to that destination",
};

export default relocateDefeatedFleet;
