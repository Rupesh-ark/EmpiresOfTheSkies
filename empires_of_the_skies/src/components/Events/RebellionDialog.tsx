import { useState } from "react";
import { Typography, Slider, Box, Chip } from "@mui/material";
import { MyGameProps, EVENT_CARD_DEFS } from "@eots/game";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { FoWCardSelector } from "@/components/atoms/FoWCardSelector";

const RebellionDialog = (props: MyGameProps) => {
  const rebellion = props.G.currentRebellion;
  const [regiments, setRegiments] = useState(0);
  const [levies, setLevies] = useState(0);
  const [selectedFoW, setSelectedFoW] = useState<number | undefined>(undefined);

  if (!rebellion) return null;
  if (rebellion.event.targetPlayerID !== props.playerID) return null;

  const player = props.G.playerInfo[rebellion.event.targetPlayerID];
  if (!player) return null;
  const maxRegiments = player.resources.regiments;
  const maxLevies = player.resources.levies;
  const def = EVENT_CARD_DEFS[rebellion.event.card];

  const totalSwords = regiments * 2 + levies;
  const fowHand = player.resources.fortuneCards;

  return (
    <DecisionPanel
      open
      title={`⚔ ${def.displayName}`}
      mood="crisis"
      width={500}
      actions={
        <>
          <GameButton variant="danger" onClick={() => props.moves.commitRebellionTroops(0, 0)}>
            Surrender
          </GameButton>
          <GameButton variant="primary" onClick={() => props.moves.commitRebellionTroops(regiments, levies, selectedFoW)}>
            {totalSwords > 0 ? "Defend!" : "Confirm Surrender"}
          </GameButton>
        </>
      }
    >
      <Typography variant="body2" sx={{ mb: 2 }}>
        {def.description}
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          p: 2,
          backgroundColor: "rgba(211, 47, 47, 0.08)",
          borderRadius: 1,
        }}
      >
        <Chip
          label={`Rebel Force: ${rebellion.counterSwords} Swords`}
          color="error"
          variant="outlined"
          sx={{ fontWeight: "bold" }}
        />
        <Chip
          label={`Your Force: ${totalSwords} Swords`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: "bold" }}
        />
      </Box>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Commit Regiments ({regiments} of {maxRegiments})
      </Typography>
      <Slider
        value={regiments}
        onChange={(_, v) => setRegiments(v as number)}
        min={0}
        max={maxRegiments}
        step={1}
        marks
        valueLabelDisplay="auto"
        disabled={maxRegiments === 0}
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Commit Levies ({levies} of {maxLevies})
      </Typography>
      <Slider
        value={levies}
        onChange={(_, v) => setLevies(v as number)}
        min={0}
        max={maxLevies}
        step={1}
        marks
        valueLabelDisplay="auto"
        disabled={maxLevies === 0}
        sx={{ mb: 2 }}
      />

      <FoWCardSelector fowHand={fowHand} selectedIndex={selectedFoW} onSelect={setSelectedFoW} />

      {totalSwords === 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1, mb: 1 }}>
          Committing no troops means the rebels win automatically!
        </Typography>
      )}
    </DecisionPanel>
  );
};

export default RebellionDialog;
