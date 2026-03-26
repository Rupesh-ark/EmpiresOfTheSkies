import { MoveDefinition, PlayerInfo } from "../../types";
import { allPlayersPassed } from "../../helpers/stateUtils";

const retrieveFleets: MoveDefinition = {
  fn: ({ G, playerID, events }, ...args) => {
    const fleets: number[] = args[0];
    if (fleets.length > 0) {
      fleets.forEach((fleetId) => {
        const currentPlayer: PlayerInfo = G.playerInfo[playerID];
        const currentFleet = currentPlayer.fleetInfo[fleetId];

        const oldLocation = currentFleet.location;

        currentFleet.location = [4, 0];

        currentPlayer.resources.skyships += currentFleet.skyships;
        currentPlayer.resources.regiments += currentFleet.regiments;
        currentPlayer.resources.levies += currentFleet.levies;
        currentPlayer.resources.eliteRegiments += currentFleet.eliteRegiments;

        currentFleet.skyships = 0;
        currentFleet.regiments = 0;
        currentFleet.levies = 0;
        currentFleet.eliteRegiments = 0;
        let shouldScrubFromBattleMap = true;
        Object.values(currentPlayer.fleetInfo).forEach((fleet) => {
          const [fleetX, fleetY] = fleet.location;

          if (fleetX === oldLocation[0] && fleetY === oldLocation[1]) {
            shouldScrubFromBattleMap = false;
          }
        });

        if (shouldScrubFromBattleMap) {
          const currentBattleMapTile =
            G.mapState.battleMap[oldLocation[1]][oldLocation[0]];
          currentBattleMapTile.splice(currentBattleMapTile.indexOf(playerID), 1);
        }
      });
    }

    G.playerInfo[playerID].passed = true;
    const flags = Object.entries(G.playerInfo).map(([id, p]) => `${id}:${p.passed}`).join(" ");
    if (allPlayersPassed(G)) {
      console.log(`[RET] P${playerID} ALL PASSED → endPhase [${flags}]`);
      events.endPhase();
    } else {
      console.log(`[RET] P${playerID} not all → endTurn [${flags}]`);
      events.endTurn();
    }
  },
  errorMessage: "Cannot retrieve fleets right now",
};

export default retrieveFleets;
