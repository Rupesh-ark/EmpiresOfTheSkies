import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { findNextPlunder } from "../../helpers/findNext";
import { increaseHeresyWithinMove, logEvent } from "../../helpers/stateUtils";

const plunder: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const currentPlayer = G.playerInfo[playerID];
  const [x, y] = G.mapState.currentBattle;
  const currentTile = G.mapState.currentTileArray[y][x];

  Object.entries(currentTile.loot.colony).forEach(([lootName, lootAmount]) => {
    //typescript requires this line/hack below on what is otherwise an inherently safe call as Resources extends TileLoot so lootName would always be a valid value, but typescript refuses to accept this
    const lootNameAsResource = lootName as keyof typeof currentTile.loot.colony;
    currentPlayer.resources[lootNameAsResource] += lootAmount;
  });
  // v4.2: plundering a Legend advances the plunderer's heresy by 1
  increaseHeresyWithinMove(G, playerID);

  const landName = currentTile?.name ?? "unknown land";
  logEvent(G, `${currentPlayer.kingdomName} plunders ${landName} (+1 heresy)`);
  findNextPlunder(G, events);
};

export default plunder;
