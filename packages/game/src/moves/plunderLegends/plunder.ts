import { Move } from "boardgame.io";
import { MyGameState } from "../../types";
import { findNextPlunder } from "../../helpers/findNext";

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
  console.log("about to find the next plunder or move to the next phase");
  findNextPlunder(G, events);
};

export default plunder;
