import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Chip,
  Typography,
  Slider,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { MyGameProps, EVENT_CARD_DEFS } from "@eots/game";

const MAX_RIVAL_TROOPS = 3;

const RebellionRivalSupportDialog = (props: MyGameProps) => {
  const rebellion = props.G.currentRebellion;
  if (!rebellion) return null;

  // Only show to rivals (not the defender) during their turn
  if (rebellion.event.targetPlayerID === props.playerID) return null;
  if (props.ctx.currentPlayer !== props.playerID) return null;

  const player = props.G.playerInfo[props.playerID ?? ""];
  if (!player) return null;

  const def = EVENT_CARD_DEFS[rebellion.event.card];
  const defenderKingdom =
    props.G.playerInfo[rebellion.event.targetPlayerID].kingdomName;

  const maxRegiments = Math.min(MAX_RIVAL_TROOPS, player.resources.regiments);
  const maxLevies = Math.min(MAX_RIVAL_TROOPS, player.resources.levies);

  const [side, setSide] = useState<"defender" | "rebel" | null>(null);
  const [regiments, setRegiments] = useState(0);
  const [levies, setLevies] = useState(0);

  // Enforce max 3 total
  const total = regiments + levies;
  const adjustedMaxReg = Math.min(maxRegiments, MAX_RIVAL_TROOPS - levies);
  const adjustedMaxLev = Math.min(maxLevies, MAX_RIVAL_TROOPS - regiments);

  const defenderSwords =
    (rebellion.defenderRegiments ?? 0) * 2 +
    (rebellion.defenderLevies ?? 0);

  return (
    <Dialog open maxWidth="sm" fullWidth>
      <DialogTitle>
        <span>&#9876;</span> {def.displayName} — Choose Your Side
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {defenderKingdom} faces a rebellion. You may contribute up to 3
          troops to either side.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Chip
            label={`Rebels: ${rebellion.counterSwords} Swords`}
            color="error"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
          <Chip
            label={`${defenderKingdom}: ${defenderSwords} Swords`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Support which side?
        </Typography>
        <ToggleButtonGroup
          value={side}
          exclusive
          onChange={(_, newSide) => {
            if (newSide !== null) setSide(newSide);
          }}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="defender" color="primary">
            Defend {defenderKingdom}
          </ToggleButton>
          <ToggleButton value="rebel" color="error">
            Support Rebels
          </ToggleButton>
        </ToggleButtonGroup>

        {side && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Regiments ({regiments} of {adjustedMaxReg} available)
            </Typography>
            <Slider
              value={regiments}
              onChange={(_, v) => setRegiments(v as number)}
              min={0}
              max={adjustedMaxReg}
              step={1}
              marks
              valueLabelDisplay="auto"
              disabled={adjustedMaxReg === 0}
              sx={{ mb: 2 }}
            />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Levies ({levies} of {adjustedMaxLev} available)
            </Typography>
            <Slider
              value={levies}
              onChange={(_, v) => setLevies(v as number)}
              min={0}
              max={adjustedMaxLev}
              step={1}
              marks
              valueLabelDisplay="auto"
              disabled={adjustedMaxLev === 0}
              sx={{ mb: 2 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          onClick={() =>
            props.moves.contributeToRebellion("defender", 0, 0)
          }
        >
          Stay Out
        </Button>
        <Button
          variant="contained"
          color={side === "rebel" ? "error" : "primary"}
          disabled={!side || total === 0}
          onClick={() =>
            props.moves.contributeToRebellion(side, regiments, levies)
          }
        >
          Contribute {total} Troop{total !== 1 ? "s" : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RebellionRivalSupportDialog;
