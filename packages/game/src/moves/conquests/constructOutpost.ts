import { Move } from "boardgame.io";
import { MyGameState } from "../../types";

const constructOutpost: Move<MyGameState> = (
  { G, ctx, playerID, events, random },
  ...args
) => {
  const [x, y] = G.mapState.currentBattle;
  const currentPlayer = G.playerInfo[playerID];
  const currentBuilding = G.mapState.buildings[y][x];
  const currentTile = G.mapState.currentTileArray[y][x];

  currentBuilding.player = currentPlayer;
  currentBuilding.buildings = "outpost";
  // TODO (GAP-15 sub-rule 2): move price markers left for outpost goods per "To Claim" rule.
  // Requires the trade-route setup step to be implemented first, because the rule only applies
  // "If a Trade Route has been established" (which the player does after placing the outpost).

  Object.entries(currentTile.loot.outpost).forEach(([lootName, value]) => {
    const lootNameAsResource = lootName as keyof typeof currentTile.loot.colony;
    currentPlayer.resources[lootNameAsResource] += value;
  });

  currentPlayer.resources.victoryPoints += 1;
  currentPlayer.heresyTracker += 1;

  G.stage = "garrison troops";
};

export default constructOutpost;
