import { useState } from "react";
import { MyGameProps } from "@eots/game";
import { Box } from "@mui/material";
import PlayerTable from "./PlayerTable/PlayerTable";
import { DialogShell } from "@/components/atoms/DialogShell";
import { DIALOG_PRIORITY } from "@/components/atoms/DialogQueue";
import { GameButton } from "@/components/atoms/GameButton";
import { tokens } from "@/theme";

const GameOverView = (props: MyGameProps) => {
  const gameover = props.ctx.gameover ?? false;
  const [viewingMap, setViewingMap] = useState(false);

  if (!gameover) return null;

  if (viewingMap) {
    return (
      <Box
        sx={{
          position: "fixed",
          bottom: `${tokens.spacing.lg}px`,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1400,
        }}
      >
        <GameButton variant="primary" size="lg" onClick={() => setViewingMap(false)}>
          Show Final Results
        </GameButton>
      </Box>
    );
  }

  return (
    <DialogShell
      open
      title="Game Over!"
      mood="peacetime"
      size="lg"
      priority={DIALOG_PRIORITY.gameOver}
      confirmLabel="View Map"
      onConfirm={() => setViewingMap(true)}
    >
      <PlayerTable {...props} />
    </DialogShell>
  );
};

export default GameOverView;
