import React, { useState } from "react";
import { MyGameProps } from "@eots/game";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { ButtonRow } from "../ActionBoard/ActionBoardButtonRow";

const ElectionDialog = (props: ElectionDialogProps) => {
  const [currentVote, setCurrentVote] = useState(props.ctx.playOrder[0]);
  const [hidden, setHidden] = useState(true);

  const buttons = props.ctx.playOrder.map((id) => {
    const buttonLabel = props.G.playerInfo[id].kingdomName;
    const buttonColour = props.G.playerInfo[id].colour;

    return (
      <Button
        key={id}
        sx={{
          backgroundColor: buttonColour,
          border: currentVote === id ? "4px solid black" : undefined,
          color: "black",
        }}
        onClick={() => {
          setCurrentVote(id);
        }}
      >
        {buttonLabel}
      </Button>
    );
  });

  return (
    <Box
      visibility={
        props.ctx.phase === "election" &&
        props.playerID === props.ctx.currentPlayer
          ? "visible"
          : "hidden"
      }
      display={"flex"}
      flexDirection={"column"}
      bgcolor={"grey.200"} //based on house of commons green
      alignItems={"center"}
    >
      <span style={{ padding: 20 }}>
        Please cast your vote for the next Archprelate
      </span>
      <ButtonRow>{buttons}</ButtonRow>
      <div hidden={hidden}>Vote received, awaiting other player votes.</div>
      <Button
        color="success"
        variant="contained"
        onClick={() => {
          setHidden(false);
          props.moves.vote(currentVote);
        }}
        sx={{ margin: 2, color: "black" }}
      >
        Confirm Vote
      </Button>
    </Box>
  );
};

interface ElectionDialogProps extends MyGameProps {}

export default ElectionDialog;
