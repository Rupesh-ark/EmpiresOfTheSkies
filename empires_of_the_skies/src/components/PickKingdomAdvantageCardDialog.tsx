import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Chip,
} from "@mui/material";
import { MyGameProps, KingdomAdvantageCard } from "@eots/game";

const CARD_LABELS: Record<KingdomAdvantageCard, string> = {
  elite_regiments: "Elite Regiments",
  improved_training: "Improved Training",
  licenced_smugglers: "Licenced Smugglers",
  more_efficient_taxation: "More Efficient Taxation",
  more_prisons: "More Prisons",
  patriarch_of_the_church: "Patriarch of the Church",
  sanctioned_piracy: "Sanctioned Piracy",
};

const PickKingdomAdvantageCardDialog = (props: MyGameProps) => {
  const [selectedCard, setSelectedCard] = useState<KingdomAdvantageCard | undefined>(undefined);
  const [open, setOpen] = useState(true);

  const availableCards = props.G.cardDecks.kingdomAdvantagePool;

  return (
    <Dialog
      maxWidth="sm"
      fullWidth
      open={
        open &&
        props.ctx.phase === "kingdom_advantage" &&
        props.ctx.currentPlayer === props.playerID
      }
    >
      <DialogTitle>Pick a Kingdom Advantage Card</DialogTitle>
      <DialogContent>
        This card gives you a permanent rule advantage for the entire game.
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
          {availableCards.map((card) => (
            <Chip
              key={card}
              label={CARD_LABELS[card]}
              onClick={() => setSelectedCard(card)}
              variant={selectedCard === card ? "filled" : "outlined"}
              color={selectedCard === card ? "primary" : "default"}
              style={{ cursor: "pointer", fontSize: "14px", padding: "4px" }}
            />
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          disabled={!selectedCard}
          onClick={() => {
            props.moves.pickKingdomAdvantageCard(selectedCard);
            setOpen(false);
          }}
        >
          Choose Card
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PickKingdomAdvantageCardDialog;