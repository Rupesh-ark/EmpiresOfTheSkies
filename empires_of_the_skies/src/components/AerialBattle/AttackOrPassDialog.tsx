import React, { useState } from "react";
import { MyGameProps } from "@eots/game";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { KingdomButton } from "../shared/KingdomButton";
import WorldMap from "../WorldMap/WorldMap";

const AttackOrPassDiaLog = (props: AerialBattleDialogProps) => {
  const [x, y] = props.G.mapState.currentBattle;
  const possibleDefenders: string[] = [];
  const [open, setOpen] = useState(true);

  props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].forEach((currentItem) => {
      if (currentItem !== props.playerID) {
        possibleDefenders.push(currentItem);
      }
    });

  const [currentKingdom, setCurrentKingdom] = useState(possibleDefenders[0]);
  const buttons = possibleDefenders.map((currentItem) => {
    return (
      <KingdomButton
        id={currentItem}
        setSelectedKingdom={setCurrentKingdom}
        selectedKingdom={currentKingdom}
        {...props}
        key={currentItem}
      ></KingdomButton>
    );
  });

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
        props.G.battleState === undefined &&
        props.G.stage === "attack or pass"
      }
    >
      <DialogTitle>Choose your battle action</DialogTitle>
      <DialogContent>
        {`Choose a kingdom's fleet to attack, or pass. Decisions to attack are
made in player order, so even if you pass you may still be attacked. If
a player has deployed more than one fleet to this tile you will be
attacking all of their present fleets. 

Current battle tile: [${1 + x}, ${4 - y}]`}
        {buttons}
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
            props.moves.doNotAttack();
            setOpen(false);
          }}
        >
          Pass
        </Button>
        <Button
          color="success"
          variant="contained"
          onClick={() => {
            props.moves.attackOtherPlayersFleet(currentKingdom);
            setOpen(false);
          }}
          disabled={!currentKingdom}
        >
          Attack!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export interface AerialBattleDialogProps extends MyGameProps {}
export default AttackOrPassDiaLog;
