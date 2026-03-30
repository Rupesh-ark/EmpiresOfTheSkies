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

const InfidelFleetCombatDialog = (props: MyGameProps) => {
  const [selectedFoW, setSelectedFoW] = useState<number | undefined>(undefined);

  const combat = props.G.infidelFleetCombat;
  if (!combat) return null;
  if (combat.targetPlayerID !== props.playerID) return null;

  const player = props.G.playerInfo[combat.targetPlayerID];
  const fleet = player.fleetInfo[combat.fleetIndex];
  const infidel = props.G.infidelFleet?.counter;
  if (!infidel) return null;

  const fowHand = player.resources.fortuneCards;

  return (
    <Dialog open maxWidth="sm" fullWidth>
      <DialogTitle>Infidel Fleet Attacks!</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The Infidel Fleet has moved to your fleet's position. Fight or evade?
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Chip
            label={`Infidel Fleet: ${infidel.swords}S / ${infidel.shields}Sh`}
            color="error"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
          <Chip
            label={`Your Fleet: ${fleet.skyships} Skyships`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          <strong>Fight:</strong> Aerial combat. If you win, the Fleet may be destroyed or flipped inactive.
          If you lose, you lose skyships and any troops aboard.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <strong>Evade:</strong> Your fleet avoids combat. The Infidel Fleet remains for piracy.
        </Typography>

        {fowHand.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Play a Fortune of War card for combat (optional)
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
          variant="outlined"
          color="warning"
          onClick={() => props.moves.respondToInfidelFleet("evade")}
        >
          Evade
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => props.moves.respondToInfidelFleet("fight", selectedFoW)}
        >
          Fight!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InfidelFleetCombatDialog;
