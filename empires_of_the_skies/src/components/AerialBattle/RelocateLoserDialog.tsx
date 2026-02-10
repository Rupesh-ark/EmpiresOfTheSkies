import React, { useState } from "react";

import { MyGameProps } from "../../types";
import WorldMap from "../WorldMap/WorldMap";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { findPossibleDestinations } from "../../helpers/helpers";

const RelocateLoserDialog = (props: RelocateLoserDialogProps) => {
  const [open, setOpen] = useState(true);

  console.log("attempting to display relocation dialog");
  const [currentTile, setCurrentTile] = React.useState(
    props.G.mapState.currentBattle
  );
  let victor = "";
  let loser = "";

  props.G.battleState &&
    Object.values(props.G.battleState).forEach((battler) => {
      if (battler.victorious === true) {
        victor = battler.id;
      } else {
        loser = battler.id;
      }
    });

  const possibleTiles = findPossibleDestinations(
    props.G,
    props.G.mapState.currentBattle,
    true
  );

  let emptyTiles: number[][] = [];

  for (let i = 1; i < possibleTiles.length; i++) {
    possibleTiles[i].forEach((tile) => {
      if (emptyTiles.length === 0 || i === 1) {
        if (props.G.mapState.battleMap[tile[1]][tile[0]].length === 0) {
          emptyTiles.push(tile);
        }
      }
    });
  }

  return (
    <Dialog
      open={
        open &&
        props.playerID === props.ctx.currentPlayer &&
        (props.playerID === victor ||
          (props.playerID === props.G.battleState?.attacker.id &&
            props.G.battleState?.defender.decision === "evade"))
      }
      maxWidth={"xl"}
    >
      <DialogTitle>{`Choose a tile to send the loser to. Current selection: [${currentTile[0]}, ${currentTile[1]}]`}</DialogTitle>
      <DialogContent>
        <WorldMap
          {...props}
          alternateOnClick={(coords: number[]) => {
            setCurrentTile(coords);
          }}
          selectableTiles={emptyTiles}
        ></WorldMap>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="success"
          onClick={() => {
            props.moves.relocateDefeatedFleet(currentTile, loser);
            setOpen(false);
          }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface RelocateLoserDialogProps extends MyGameProps {}

export default RelocateLoserDialog;
