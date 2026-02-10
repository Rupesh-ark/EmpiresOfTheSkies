import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { findNextPlayerInBattleSequence } from "../../helpers/findNext";

const relocateDefeatedFleet: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  console.log("relocation initiated");
  const destination = args[0];
  console.log(destination);
  const defeatedPlayer = args[1];
  console.log(defeatedPlayer);
  const [x, y] = G.mapState.currentBattle;
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
};

export default relocateDefeatedFleet;
