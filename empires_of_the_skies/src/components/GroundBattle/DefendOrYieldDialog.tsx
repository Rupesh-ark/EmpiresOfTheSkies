import React, { useState } from "react";
import { MyGameProps } from "@eots/game";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

import { colourToKingdomMap } from "@eots/game";
import WorldMap from "../WorldMap/WorldMap";

const DefendOrYieldDialog = (props: DefendOrYieldDialogProps) => {
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
        props.ctx.phase === "ground_battle" &&
        props.G.stage === "defend or yield" &&
        inCurrentBattle &&
        props.G.battleState?.defender.id === props.playerID &&
        props.G.battleState.defender.decision === "undecided"
      }
    >
      <DialogTitle>Your region is under attack!</DialogTitle>
      <DialogContent>
        {`Your fleet on tile [${1 + x}, ${4 - y}] is under attack by ${
          props.G.battleState
            ? colourToKingdomMap[props.G.battleState?.attacker.colour]
            : "ERROR"
        }. 
        
You can either yield the region and all its buildings or fight back. If you yield, the attacking kingdom will get control over any outposts, colonies or forts which are present in the region and your troops will be returned safely to your kingdom.`}

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
            props.moves.yieldToAttacker();
            setOpen(false);
          }}
        >
          Yield
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={() => {
            props.moves.defendGroundAttack();
            setOpen(false);
          }}
        >
          Defend
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface DefendOrYieldDialogProps extends MyGameProps {}

export default DefendOrYieldDialog;
