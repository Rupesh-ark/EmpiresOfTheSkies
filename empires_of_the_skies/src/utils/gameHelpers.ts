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
