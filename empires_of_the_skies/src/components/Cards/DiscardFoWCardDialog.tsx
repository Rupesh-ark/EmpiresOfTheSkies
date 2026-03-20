import { MyGameProps } from "@eots/game";
import { Button, Typography, Box } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";

const DiscardFoWCardDialog = (props: MyGameProps) => {
  if (props.G.stage !== "discard_fow" || props.ctx.currentPlayer !== props.playerID || !props.playerID) return null;

  const hand = props.G.playerInfo[props.playerID].resources.fortuneCards;
  const maxCards = 4;

  return (
    <DialogShell open title="Discard Fortunes of War Cards" mood="battle" size="sm" hideActions>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Your hand exceeds {maxCards} cards. Discard down to {maxCards} by clicking cards to remove. ({hand.length} / {maxCards})
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {hand.map((card, i) => (
          <Button
            key={`${card.name}-${i}`}
            variant="outlined"
            onClick={() => props.moves.discardFoWCard(i)}
            sx={{ minWidth: 100, flexDirection: "column", textTransform: "none", border: "2px solid", borderColor: card.sword > 0 ? "#c62828" : card.shield > 0 ? "#1565c0" : "#757575", color: "text.primary" }}
          >
            <Typography variant="body2" fontWeight={700}>
              {card.sword > 0 ? `${card.sword} Swords` : card.shield > 0 ? `${card.shield} Shields` : "No Effect"}
            </Typography>
          </Button>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
        Click a card to discard it
      </Typography>
    </DialogShell>
  );
};

export default DiscardFoWCardDialog;
