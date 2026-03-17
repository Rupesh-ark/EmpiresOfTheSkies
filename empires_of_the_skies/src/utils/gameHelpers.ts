import { MyGameProps, PlayerInfo, createLogger } from "@eots/game";

const log = createLogger("ui");

export const clearMoves = (props: MyGameProps) => {
  if (props.ctx.numMoves) {
    log.info("undo", { numMoves: props.ctx.numMoves });

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