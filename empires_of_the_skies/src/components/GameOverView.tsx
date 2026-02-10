import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { MyGameProps } from "../types";
import React from "react";
import PlayerTable from "./PlayerTable/PlayerTable";

const GameOverView = (props: MyGameProps) => {
  const open = props.ctx.gameover ?? false;
  return (
    <Dialog open={open} maxWidth={"xl"}>
      <DialogTitle>Game over!</DialogTitle>
      <DialogContent>
        <PlayerTable {...props}></PlayerTable>
      </DialogContent>
    </Dialog>
  );
};

export default GameOverView;
