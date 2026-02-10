import React, { useState } from "react";
import { MyGameProps } from "../../types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import WorldMap from "../WorldMap/WorldMap";

const AttackOrPassDiaLog = (props: AerialBattleDialogProps) => {
  const [x, y] = props.G.mapState.currentBattle;

  const [open, setOpen] = useState(true);

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  return (
    <Dialog
      maxWidth={"xl"}
      open={
        open &&
        props.ctx.currentPlayer === props.playerID &&
        props.ctx.phase === "conquest" &&
        inCurrentBattle &&
        props.G.conquestState === undefined &&
        props.G.stage === "conquest"
      }
    >
      <DialogTitle>Choose your battle action</DialogTitle>
      <DialogContent>
        {`Would you like to establish an outpost or battle with the local inhabitants in an attempt to create a colony? You must completely wipe out the locals to be successful. 
If you lose and you already have an outpost in this region, it will be lost along with any garrisoned troops who cannot fit on board your remaining skyships.

Current map tile: [${1 + x}, ${4 - y}]`}

        <WorldMap
          {...props}
          selectableTiles={[props.G.mapState.currentBattle]}
        ></WorldMap>
      </DialogContent>
      <DialogActions>
        <Button
          color="warning"
          variant="contained"
          onClick={() => {
            props.moves.doNothing();
            setOpen(false);
          }}
        >
          Pass
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={() => {
            props.moves.constructOutpost();
            setOpen(false);
          }}
        >
          Outpost
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={() => {
            props.moves.coloniseLand();
            setOpen(false);
          }}
        >
          Colony
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export interface AerialBattleDialogProps extends MyGameProps {}
export default AttackOrPassDiaLog;
