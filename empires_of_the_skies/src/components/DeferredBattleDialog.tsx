import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Chip,
  Typography,
  Box,
} from "@mui/material";
import { MyGameProps } from "@eots/game";

const DeferredBattleDialog = (props: MyGameProps) => {
  const [selectedFoW, setSelectedFoW] = useState<number | undefined>(undefined);

  const battle = props.G.currentDeferredBattle;
  if (!battle) return null;
  if (battle.event.targetPlayerID !== props.playerID) return null;

  const player = props.G.playerInfo[battle.event.targetPlayerID];
  const fowHand = player.resources.fortuneCards;

  const cardLabel = battle.event.card.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Dialog open maxWidth="sm" fullWidth>
      <DialogTitle>{cardLabel}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {battle.description}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Chip
            label={`Event: ${cardLabel}`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          You may play a Fortune of War card to aid your forces.
          If you don't play one, a random card will be drawn from the deck.
        </Typography>

        {fowHand.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Play a Fortune of War card (optional)
            </Typography>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {fowHand.map((card, idx) => {
                const label = card.sword > 0
                  ? `${card.sword} Sword${card.sword > 1 ? "s" : ""}`
                  : `${card.shield} Shield${card.shield > 1 ? "s" : ""}`;
                return (
                  <Chip
                    key={idx}
                    label={label}
                    onClick={() => setSelectedFoW(selectedFoW === idx ? undefined : idx)}
                    variant={selectedFoW === idx ? "filled" : "outlined"}
                    color={selectedFoW === idx ? "success" : "default"}
                    sx={{ cursor: "pointer" }}
                  />
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="primary"
          onClick={() => props.moves.commitDeferredBattleCard(selectedFoW)}
        >
          {selectedFoW !== undefined ? "Play Card & Resolve" : "Resolve Battle"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeferredBattleDialog;
