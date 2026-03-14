import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Chip,
  Tooltip,
  Typography,
} from "@mui/material";
import { MyGameProps, EventCardName, EVENT_CARD_DEFS } from "@eots/game";

const PickEventCardDialog = (props: MyGameProps) => {
  const [selectedCard, setSelectedCard] = useState<
    EventCardName | undefined
  >(undefined);
  const [open, setOpen] = useState(true);

  const playerID = props.playerID ?? props.ctx.currentPlayer;
  const hand = props.G.playerInfo[playerID]?.resources.eventCards ?? [];

  return (
    <Dialog
      maxWidth="sm"
      fullWidth
      open={
        open &&
        props.G.stage === "events" &&
        props.ctx.currentPlayer === props.playerID
      }
    >
      <DialogTitle>Choose an Event Card</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Pick one card to play face-down. All chosen cards will be shuffled
          and one will be revealed and resolved.
        </Typography>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          {hand.map((card) => {
            const def = EVENT_CARD_DEFS[card];
            return (
              <Tooltip key={card} title={def.description} arrow>
                <Chip
                  label={def.displayName}
                  onClick={() => setSelectedCard(card)}
                  variant={selectedCard === card ? "filled" : "outlined"}
                  color={selectedCard === card ? "primary" : "default"}
                  icon={
                    def.isBattle ? (
                      <span style={{ fontSize: "14px" }}>&#9876;</span>
                    ) : undefined
                  }
                  sx={{
                    cursor: "pointer",
                    fontSize: "13px",
                    padding: "4px 2px",
                    height: 36,
                  }}
                />
              </Tooltip>
            );
          })}
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          disabled={!selectedCard}
          onClick={() => {
            props.moves.chooseEventCard(selectedCard);
            setOpen(false);
          }}
        >
          Play Card
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PickEventCardDialog;
