import { MyGameProps, PlayerInfo } from "@eots/game";

export const clearMoves = (props: MyGameProps) => {
  if (props.ctx.numMoves) {
    for (let i = 0; i < props.ctx.numMoves; i++) {
      props.undo();
    }
  }
};

export const checkPlayerIDAndReturnPlayerInfo = (
  props: MyGameProps
): PlayerInfo => {
  if (props.playerID) {
    return props.G.playerInfo[props.playerID];
  } else {
    throw new Error("No playerID found in props");
  }
};

/**
 * Returns the number of actions a player can still take this round.
 * Under the v4.2 unlimited-counsellor model, counsellors represent the
 * maximum actions per round and actionsTakenThisRound tracks usage.
 */
export const getAvailableActions = (player: PlayerInfo): number =>
  Math.max(0, player.resources.counsellors - player.actionsTakenThisRound);
