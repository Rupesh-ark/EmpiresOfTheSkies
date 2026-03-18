import { useState } from "react";
import { MyGameProps } from "@eots/game";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { fonts } from "@/designTokens";
import { ButtonRow } from "../ActionBoard/components/ActionBoardButtonRow";

const ElectionDialog = (props: MyGameProps) => {
  const [currentVote, setCurrentVote] = useState<string | null>(null);

  // Show dialog if: election phase, this player is in the "voting" stage, and hasn't voted yet
  const isVoting =
    props.ctx.phase === "election" &&
    props.playerID != null &&
    props.ctx.activePlayers?.[props.playerID] === "voting" &&
    !props.G.hasVoted.includes(props.playerID);

  const buttons = props.ctx.playOrder.map((id) => {
    const kingdom = props.G.playerInfo[id];
    return (
      <Button
        key={id}
        sx={{
          backgroundColor: kingdom.colour,
          border: currentVote === id ? "4px solid black" : undefined,
          color: "black",
          fontFamily: fonts.primary,
          "&:hover": { filter: "brightness(0.9)" },
        }}
        onClick={() => setCurrentVote(id)}
      >
        {kingdom.kingdomName}
      </Button>
    );
  });

  return (
    <Dialog open={!!isVoting} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: fonts.primary }}>
        Archprelate Election
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontFamily: fonts.primary, mb: 2 }}>
          Cast your vote for the next Archprelate. The kingdom with the most
          cathedral votes wins.
        </Typography>
        <ButtonRow>{buttons}</ButtonRow>
        {currentVote && (
          <Typography sx={{ fontFamily: fonts.primary, mt: 2, fontStyle: "italic" }}>
            Voting for: {props.G.playerInfo[currentVote].kingdomName}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="success"
          disabled={currentVote === null}
          onClick={() => {
            props.moves.vote(currentVote);
          }}
        >
          Confirm Vote
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ElectionDialog;
