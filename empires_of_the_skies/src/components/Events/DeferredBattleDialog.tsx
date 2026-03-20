import { useState } from "react";
import { Chip, Typography, Box } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";

const DeferredBattleDialog = (props: MyGameProps) => {
  const [selectedFoW, setSelectedFoW] = useState<number | undefined>(undefined);
  const battle = props.G.currentDeferredBattle;
  if (!battle) return null;
  if (battle.event.targetPlayerID !== props.playerID) return null;

  const player = props.G.playerInfo[battle.event.targetPlayerID];
  const fowHand = player.resources.fortuneCards;
  const cardLabel = battle.event.card.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <DialogShell open title={cardLabel} mood="battle" size="sm" hideActions>
      <Typography variant="body2" sx={{ mb: 2 }}>{battle.description}</Typography>
      <Box sx={{ mb: 2 }}>
        <Chip label={`Event: ${cardLabel}`} color="warning" variant="outlined" sx={{ fontWeight: "bold" }} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        You may play a Fortune of War card to aid your forces. If you don't, a random card will be drawn.
      </Typography>
      {fowHand.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Play a Fortune of War card (optional)</Typography>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {fowHand.map((card, idx) => {
              const label = card.sword > 0 ? `${card.sword} Sword${card.sword > 1 ? "s" : ""}` : `${card.shield} Shield${card.shield > 1 ? "s" : ""}`;
              return (<Chip key={idx} label={label} onClick={() => setSelectedFoW(selectedFoW === idx ? undefined : idx)} variant={selectedFoW === idx ? "filled" : "outlined"} color={selectedFoW === idx ? "success" : "default"} sx={{ cursor: "pointer" }} />);
            })}
          </div>
        </>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <GameButton variant="primary" onClick={() => props.moves.commitDeferredBattleCard(selectedFoW)}>
          {selectedFoW !== undefined ? "Play Card & Resolve" : "Resolve Battle"}
        </GameButton>
      </div>
    </DialogShell>
  );
};

export default DeferredBattleDialog;
