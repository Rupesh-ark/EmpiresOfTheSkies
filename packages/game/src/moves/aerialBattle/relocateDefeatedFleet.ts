import { INVALID_MOVE } from "boardgame.io/core";
import { MoveDefinition } from "../../types.js";
import { FAITHDOM_TILES } from "../../helpers/mapUtils.js";
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
    const sub = G.step;
    if (sub !== "relocate_loser") {
      return { code: "WRONG_STAGE", message: "Cannot relocate fleet in this stage" };
    }
    return null;
  },
  fn: ({ G, ctx, playerID, events }, ...args) => {
    const destination = args[0];
    const defeatedPlayer = args[1];
    const [x, y] = G.mapState.currentBattle;

    if (
      !Array.isArray(destination) ||
      destination.length < 2 ||
      typeof destination[0] !== "number" ||
      typeof destination[1] !== "number"
    ) {
      return INVALID_MOVE;
    }

    // Stay-put wins over the Faithdom check: a battle fought inside the
    // Faithdom region offers its own square as a destination, and choosing it
    // must keep the fleets in place, not force-retrieve them home.
    const isStayPut = destination[0] === x && destination[1] === y;
    const isRetreatHome =
      !isStayPut &&
      FAITHDOM_TILES.some(
        ([fx, fy]) => fx === destination[0] && fy === destination[1]
      );
    const isOfferedDestination = G.validRelocationTiles.some(
      ([tx, ty]) => tx === destination[0] && ty === destination[1]
    );

    if (!isRetreatHome && !isOfferedDestination) {
      return INVALID_MOVE;
    }

    if (isRetreatHome) {
      forceRetrieveFleets(G, defeatedPlayer, x, y);
    } else {
      G.playerInfo[defeatedPlayer].fleetInfo.forEach((fleet) => {
        if (fleet.location[0] === x && fleet.location[1] === y) {
          fleet.location = [...destination];
        }
      });

      if (destination[0] !== x || destination[1] !== y) {
        const originPlayers = G.mapState.battleMap[y][x];
        const defeatedPlayerIndex = originPlayers.indexOf(defeatedPlayer);
        if (defeatedPlayerIndex >= 0) {
          originPlayers.splice(defeatedPlayerIndex, 1);
        }

        const destinationPlayers =
          G.mapState.battleMap[destination[1]][destination[0]];
        if (!destinationPlayers.includes(defeatedPlayer)) {
          destinationPlayers.push(defeatedPlayer);
        }
      }
    }

    // Advance: next player at this tile, or next tile, or plunder
    nextAfterAerialDecision(G, ctx, events, G.battleState?.attacker.id ?? playerID);
  },
  errorMessage: "Cannot relocate fleet to that destination",
  successLog: (G, _pid, destination, defeatedPlayer) => {
    const k = G.playerInfo[defeatedPlayer]?.kingdomName ?? "A fleet";
    const [dx, dy] = destination ?? [];
    if (FAITHDOM_TILES.some(([fx, fy]) => fx === dx && fy === dy)) {
      return `${k}'s fleet retreats home`;
    }
    return `${k}'s fleet withdraws to [${dx}, ${dy}]`;
  },
};

export default relocateDefeatedFleet;
