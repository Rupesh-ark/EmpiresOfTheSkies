import { useState } from "react";
import { MyGameProps } from "@eots/game";
import { Button, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { ButtonRow } from "../ActionBoard/components/ActionBoardButtonRow";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";

const ElectionDialog = (props: MyGameProps) => {
  const [currentVote, setCurrentVote] = useState<string | null>(null);

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
          fontFamily: tokens.font.display,
          "&:hover": { filter: "brightness(0.9)" },
        }}
        onClick={() => setCurrentVote(id)}
      >
        {kingdom.kingdomName}
      </Button>
    );
  });

  return (
    <DialogShell
      open={!!isVoting}
      title="Archprelate Election"
      mood="election"
      size="sm"
      hideActions
    >
      <Typography sx={{ fontFamily: tokens.font.display, mb: 2 }}>
        Cast your vote for the next Archprelate. The kingdom with the most
        cathedral votes wins.
      </Typography>
      <ButtonRow>{buttons}</ButtonRow>
      {currentVote && (
        <Typography sx={{ fontFamily: tokens.font.display, mt: 2, fontStyle: "italic" }}>
          Voting for: {props.G.playerInfo[currentVote].kingdomName}
        </Typography>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <GameButton
          variant="primary"
          disabled={currentVote === null}
          onClick={() => props.moves.vote(currentVote)}
        >
          Confirm Vote
        </GameButton>
      </div>
    </DialogShell>
  );
};

export default ElectionDialog;
