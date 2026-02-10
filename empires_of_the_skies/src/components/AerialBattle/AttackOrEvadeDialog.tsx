import React, { useState } from "react";
import { MyGameProps } from "../../types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

import { colourToKingdomMap } from "../../codifiedGameInfo";
import WorldMap from "../WorldMap/WorldMap";

const AttackOrEvadeDialog = (props: AttackOrEvadeDialogProps) => {
  const [open, setOpen] = useState(true);

  const [x, y] = props.G.mapState.currentBattle;
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
        props.ctx.phase === "aerial_battle" &&
        inCurrentBattle &&
        props.G.battleState?.defender.id === props.playerID &&
        props.G.battleState.defender.decision === "undecided"
      }
    >
      <DialogTitle>Your fleet is under attack!</DialogTitle>
      <DialogContent>
        {`Your fleet on tile [${1 + x}, ${4 - y}] is under attack by ${
          props.G.battleState
            ? colourToKingdomMap[props.G.battleState?.attacker.colour]
            : "ERROR"
        }. 
        
You can either evade or fight back. If you evade, the attacking kingdom will get to move your fleet to an adjoining tile of their choosing.`}

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
            props.moves.evadeAttackingFleet();
            setOpen(false);
          }}
        >
          Evade
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={() => {
            props.moves.retaliate();
            setOpen(false);
          }}
        >
          Attack!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AttackOrEvadeDialogProps extends MyGameProps {}

export default AttackOrEvadeDialog;
