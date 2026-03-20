import { Typography } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";

const ConfirmDrawDialog = (props: MyGameProps) => {
  const isOpen = props.G.stage === "confirm_fow_draw" && props.ctx.currentPlayer === props.playerID;

  return (
    <DialogShell
      open={isOpen}
      title="Draw Fortune of War Cards"
      mood="battle"
      size="sm"
      confirmLabel="Draw Cards"
      onConfirm={() => props.moves.drawFoWCards()}
    >
      <Typography>
        You are about to draw 2 Fortune of War cards. These cards are used in
        aerial and ground battles to determine combat strength. This action
        cannot be undone.
      </Typography>
    </DialogShell>
  );
};

export default ConfirmDrawDialog;
