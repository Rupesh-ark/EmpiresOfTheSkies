import React, { useState } from "react";

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
} from "@mui/material";
import { MyGameProps, LegacyCard } from "../types";
import svgNameToElementMap from "./WorldMap/nameToElementMap";

const PickLegacyCardDialog = (props: DrawOrPickCardDialogProps) => {
  const [x, y] = props.G.mapState.currentBattle;
  const [currentCard, setCurrentCard] = useState<LegacyCard>(undefined);
  const [open, setOpen] = useState(true);

  const cards = (
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]
      .legacyCardOptions as Array<LegacyCard>
  ).map((card) => {
    if (card) {
      const displayImage = svgNameToElementMap[card];

      return (
        <div
          onClick={() => setCurrentCard(card)}
          style={{
            cursor: "pointer",
            height: "fit-content",
            width: "fit-content",
            border: card === currentCard ? "2px solid black" : "none",
          }}
        >
          <svg
            style={{
              backgroundImage: `url(${displayImage})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
              width: "137px",
              height: "250px",
              margin: "5px",
            }}
          ></svg>
        </div>
      );
    }
  });

  return (
    <Dialog
      maxWidth={"xl"}
      open={
        open &&
        props.ctx.phase === "legacy_card" &&
        props.ctx.currentPlayer === props.playerID
      }
    >
      <DialogTitle>Pick a Legacy Card</DialogTitle>
      <DialogContent>
        This card will be used at the end of the game to calculate your total
        score.
        <div style={{ display: "flex", flexDirection: "row" }}>{cards}</div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          disabled={!currentCard}
          onClick={() => {
            props.moves.pickLegacyCard(currentCard);
            setOpen(false);
          }}
        >
          Use selected card
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface DrawOrPickCardDialogProps extends MyGameProps {}

export default PickLegacyCardDialog;
