import { Move } from "boardgame.io";
import { FleetInfo, MyGameState, PlayerInfo } from "../../types";

const retrieveFleets: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const fleets: number[] = args[0];
  if (fleets.length > 0) {
    fleets.forEach((fleetId) => {
      const currentPlayer: PlayerInfo = G.playerInfo[playerID];
      const currentFleet = currentPlayer.fleetInfo[fleetId];

      const oldLocation = currentFleet.location;

      currentFleet.location = [4, 0];
      console.log(
        `New fleet location: ${G.playerInfo[playerID].fleetInfo[fleetId].location}`
      );

      currentPlayer.resources.skyships += currentFleet.skyships;
      currentPlayer.resources.regiments += currentFleet.regiments;
      currentPlayer.resources.levies += currentFleet.levies;

      currentFleet.skyships = 0;
      currentFleet.regiments = 0;
      currentFleet.levies = 0;
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

  events.endTurn();
};

export default retrieveFleets;
