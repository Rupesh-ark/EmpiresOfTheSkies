import React, { useState } from "react";
import { MyGameProps } from "@eots/game";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

import WorldMap from "../WorldMap/WorldMap";

const GroundAttackOrPassDialog = (props: GroundAttackOrPassDialogProps) => {
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
        props.ctx.phase === "ground_battle" &&
        inCurrentBattle &&
        props.G.battleState === undefined &&
        props.G.stage === "attack or pass"
      }
      style={{
        color:
          props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer].colour,
      }}
    >
      <DialogTitle>Choose your battle action</DialogTitle>
      <DialogContent>
        {`Do you want to attack this enemy's region? You must completely wipe them out in order to take control of the region.
Current battle tile: [${1 + x}, ${4 - y}]`}

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
            props.moves.doNotGroundAttack();
            setOpen(false);
          }}
        >
          Pass
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={() => {
            props.moves.attackPlayersBuilding();
            setOpen(false);
          }}
        >
          Attack!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export interface GroundAttackOrPassDialogProps extends MyGameProps {}
export default GroundAttackOrPassDialog;
