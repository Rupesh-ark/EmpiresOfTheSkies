import { MyGameProps, PlayerInfo } from "@eots/game";

export const clearMoves = (props: MyGameProps) => {
  if (props.ctx.numMoves) {
    for (let i = 0; i < props.ctx.numMoves; i++) {
      props.undo();
    }
  }
};

/**
 * Returns the number of actions a player can still take this round.
 * Under the v4.2 unlimited-counsellor model, counsellors represent the
 * maximum actions per round and actionsTakenThisRound tracks usage.
 */
export const getAvailableActions = (player: PlayerInfo): number =>
  Math.max(0, player.resources.counsellors - player.actionsTakenThisRound);

/**
 * Gold cost per destination from findPossibleDestinations output
 * ([allTiles, ring1, ring2, ...] — cost = ring index, nearest ring wins).
 */
export const buildMovementCostMap = (
  destinationGroups: [number, number][][]
): Map<string, number> => {
  const costMap = new Map<string, number>();
  for (let ring = destinationGroups.length - 1; ring >= 1; ring--) {
    for (const [x, y] of destinationGroups[ring]) costMap.set(`${x},${y}`, ring);
  }
  return costMap;
};
