import { Typography } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { clearMoves } from "@/utils/gameHelpers";
import { tokens } from "@/theme";

const ConfirmDrawDialog = (props: MyGameProps) => {
  const isOpen = props.G.step === "confirm_fow_draw" && props.ctx.currentPlayer === props.playerID;

  return (
    <DecisionPanel
      open={isOpen}
      title="Draw Fortune of War Cards"
      mood="battle"
      actions={
        <>
          <GameButton variant="ghost" onClick={() => clearMoves(props)}>
            Cancel
          </GameButton>
          <GameButton variant="primary" onClick={() => props.moves.drawFoWCards()}>
            Draw Cards
          </GameButton>
        </>
      }
    >
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm }}>
        You are about to draw 2 Fortune of War cards. These cards are used in
        aerial and ground battles to determine combat strength. This action
        cannot be undone.
      </Typography>
    </DecisionPanel>
  );
};

export default ConfirmDrawDialog;
