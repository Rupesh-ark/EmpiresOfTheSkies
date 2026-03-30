import { useState } from "react";
import { Typography, Box, Chip } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { FoWCardSelector } from "@/components/atoms/FoWCardSelector";

const DeferredBattleDialog = (props: MyGameProps) => {
  const [selectedFoW, setSelectedFoW] = useState<number | undefined>(undefined);
  const battle = props.G.currentDeferredBattle;
  if (!battle) return null;
  if (battle.event.targetPlayerID !== props.playerID) return null;

  const player = props.G.playerInfo[battle.event.targetPlayerID];
  const fowHand = player.resources.fortuneCards;
  const cardLabel = battle.event.card.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <DialogShell
      open
      title={cardLabel}
      mood="battle"
      size="sm"
      confirmLabel={selectedFoW !== undefined ? "Play Card & Resolve" : "Resolve Battle"}
      onConfirm={() => props.moves.commitDeferredBattleCard(selectedFoW)}
    >
      <Typography variant="body2" sx={{ mb: 2 }}>{battle.description}</Typography>
      <Box sx={{ mb: 2 }}>
        <Chip label={`Event: ${cardLabel}`} color="warning" variant="outlined" sx={{ fontWeight: "bold" }} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        You may play a Fortune of War card to aid your forces. If you don't, a random card will be drawn.
      </Typography>
      <FoWCardSelector fowHand={fowHand} selectedIndex={selectedFoW} onSelect={setSelectedFoW} />
    </DialogShell>
  );
};

export default DeferredBattleDialog;
