import React, { useState } from "react";

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
} from "@mui/material";
import { MyGameProps } from "../../types";
import FortuneOfWarCardDisplay from "../PlayerBoard/FortuneOfWarCardDisplay";
import WorldMap from "../WorldMap/WorldMap";

const DrawOrPickCardDialog = (props: DrawOrPickCardDialogProps) => {
  const [x, y] = props.G.mapState.currentBattle;
  const [currentCard, setCurrentCard] = useState(0);
  const [open, setOpen] = useState(true);

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  const cards = props.G.playerInfo[
    props.playerID ?? props.ctx.currentPlayer
  ].resources.fortuneCards.map((card, index) => {
    return (
      <div
        onClick={() => setCurrentCard(index)}
        key={index}
        style={{
          cursor: "pointer",
          height: "fit-content",
          width: "fit-content",
          border: index === currentCard ? "2px solid black" : "none",
        }}
      >
        <FortuneOfWarCardDisplay
          value={index}
          {...props}
        ></FortuneOfWarCardDisplay>
      </div>
    );
  });

  return (
    <Dialog
      maxWidth={"xl"}
      open={
        open &&
        ((props.playerID === props.ctx.currentPlayer &&
          inCurrentBattle &&
          props.G.battleState?.attacker.decision === "fight" &&
          props.G.battleState?.defender.decision === "fight" &&
          !props.G.battleState?.attacker.victorious &&
          !props.G.battleState?.defender.victorious) ||
          (props.playerID === props.ctx.currentPlayer &&
            inCurrentBattle &&
            props.G.stage === "conquest draw or pick card" &&
            props.ctx.phase === "conquest" &&
            props.G.conquestState !== undefined &&
            props.G.conquestState.id === props.playerID))
      }
    >
      <DialogTitle>Draw or Pick a Card</DialogTitle>
      <DialogContent>
        You can either draw a random fortune of war card, or pick one from your
        hand if you have any.
        <div style={{ display: "flex", flexDirection: "row" }}>{cards}</div>
        <WorldMap
          {...props}
          selectableTiles={[props.G.mapState.currentBattle]}
        ></WorldMap>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            props.ctx.phase === "conquest"
              ? props.moves.pickCardConquest(currentCard)
              : props.moves.pickCard(currentCard);

            setOpen(false);
          }}
          disabled={cards.length === 0}
        >
          Use selected card
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            props.ctx.phase === "conquest"
              ? props.moves.drawCardConquest()
              : props.moves.drawCard();

            setOpen(false);
          }}
        >
          Draw random card
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface DrawOrPickCardDialogProps extends MyGameProps {}

export default DrawOrPickCardDialog;
