import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import { MyGameProps } from "@eots/game";

const ConfirmDrawDialog = (props: MyGameProps) => {
  const isOpen =
    props.G.stage === "confirm_fow_draw" &&
    props.ctx.currentPlayer === props.playerID;

  return (
    <Dialog maxWidth="sm" fullWidth open={isOpen}>
      <DialogTitle>Draw Fortune of War Cards</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You are about to draw 2 Fortune of War cards. These cards are used in
          aerial and ground battles to determine combat strength. This action
          cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => props.moves.drawFoWCards()}
        >
          Draw Cards
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDrawDialog;
