import React, { useState } from "react";
import { MyGameProps } from "@eots/game";

import WorldMap from "../WorldMap/WorldMap";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

const PlunderLegendsDialog = (props: PlunderLegendsDialogProps) => {
  const [open, setOpen] = useState(true);

  return (
    <Dialog
      maxWidth={"xl"}
      open={
        open &&
        props.playerID === props.ctx.currentPlayer &&
        props.G.stage === "plunder legends" &&
        props.ctx.phase === "plunder_legends"
      }
    >
      <DialogTitle>Would you like to plunder this legend?</DialogTitle>
      <DialogContent>
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
            props.moves.doNotPlunder();
            setOpen(false);
          }}
        >
          Do not Plunder
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={() => {
            props.moves.plunder();
            setOpen(false);
          }}
        >
          Plunder Legend
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface PlunderLegendsDialogProps extends MyGameProps {}
export default PlunderLegendsDialog;
