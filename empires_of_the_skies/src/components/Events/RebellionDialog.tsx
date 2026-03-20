import { useState } from "react";
import { Typography, Slider, Box, Chip } from "@mui/material";
import { MyGameProps, EVENT_CARD_DEFS } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { GameButton } from "@/components/atoms/GameButton";

const RebellionDialog = (props: MyGameProps) => {
  const rebellion = props.G.currentRebellion;
  if (!rebellion) return null;
  if (rebellion.event.targetPlayerID !== props.playerID) return null;

  const player = props.G.playerInfo[rebellion.event.targetPlayerID];
  const maxRegiments = player.resources.regiments;
  const maxLevies = player.resources.levies;
  const def = EVENT_CARD_DEFS[rebellion.event.card];

  const [regiments, setRegiments] = useState(maxRegiments);
  const [levies, setLevies] = useState(maxLevies);
  const [selectedFoW, setSelectedFoW] = useState<number | undefined>(undefined);

  const totalSwords = regiments * 2 + levies;
  const fowHand = player.resources.fortuneCards;

  return (
    <DialogShell
      open
      title={`⚔ ${def.displayName}`}
      mood="crisis"
      size="sm"
      hideActions
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

      {fowHand.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Play a Fortune of War card (optional)
          </Typography>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
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

      {totalSwords === 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          Committing no troops means the rebels win automatically!
        </Typography>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <GameButton
          variant="danger"
          onClick={() => props.moves.commitRebellionTroops(0, 0)}
        >
          Surrender
        </GameButton>
        <GameButton
          variant="primary"
          onClick={() => props.moves.commitRebellionTroops(regiments, levies, selectedFoW)}
        >
          {totalSwords > 0 ? "Defend!" : "Confirm Surrender"}
        </GameButton>
      </div>
    </DialogShell>
  );
};

export default RebellionDialog;
