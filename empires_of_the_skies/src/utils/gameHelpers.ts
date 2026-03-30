import { MyGameProps, PlayerInfo } from "@eots/game";

export const clearMoves = (props: MyGameProps) => {
  if (props.ctx.numMoves) {
    console.log(`undoing ${props.ctx.numMoves} move(s)`);

    for (let i = 0; i < props.ctx.numMoves; i++) {
      props.undo();
    }
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer].turnComplete =
      false;
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