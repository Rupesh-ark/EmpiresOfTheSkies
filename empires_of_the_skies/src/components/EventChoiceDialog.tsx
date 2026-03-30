import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Chip,
  Typography,
} from "@mui/material";
import {
  MyGameProps,
  EVENT_CARD_DEFS,
  LegacyCardInfo,
} from "@eots/game";

const EventChoiceDialog = (props: MyGameProps) => {
  const [selected, setSelected] = useState<any>(undefined);

  const choice = props.G.eventState.pendingChoice;
  if (!choice) return null;
  if (choice.targetPlayerID !== props.playerID) return null;

  const def = EVENT_CARD_DEFS[choice.card];

  // ── The Great Fire: pick a building type ─────────────────────────────────
  if (choice.buildingOptions) {
    return (
      <Dialog open maxWidth="sm" fullWidth>
        <DialogTitle>The Great Fire</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            A fire destroys one of your grand buildings. Choose which to lose:
          </Typography>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {choice.buildingOptions.map((type) => (
              <Chip
                key={type}
                label={type.charAt(0).toUpperCase() + type.slice(1)}
                onClick={() => setSelected(type)}
                variant={selected === type ? "filled" : "outlined"}
                color={selected === type ? "error" : "default"}
                sx={{ cursor: "pointer", fontSize: "14px", padding: "4px" }}
              />
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            disabled={!selected}
            onClick={() => props.moves.resolveEventChoice(selected)}
          >
            Lose Building
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Royal Succession: pick a legacy card ─────────────────────────────────
  if (choice.legacyOptions) {
    return (
      <Dialog open maxWidth="sm" fullWidth>
        <DialogTitle>Royal Succession</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your legacy card has been scored. Choose a new one:
          </Typography>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {choice.legacyOptions.map((card) => {
              const isSelected =
                selected?.name === card.name && selected?.colour === card.colour;
              return (
                <Chip
                  key={`${card.name}-${card.colour}`}
                  label={`${card.name} (${card.colour})`}
                  onClick={() => setSelected(card)}
                  variant={isSelected ? "filled" : "outlined"}
                  color={isSelected ? "primary" : "default"}
                  sx={{
                    cursor: "pointer",
                    fontSize: "13px",
                    padding: "4px",
                    borderColor: card.colour === "orange" ? "#E77B00" : "#A74383",
                    ...(isSelected
                      ? {}
                      : { color: card.colour === "orange" ? "#E77B00" : "#A74383" }),
                  }}
                />
              );
            })}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            disabled={!selected}
            onClick={() => props.moves.resolveEventChoice(selected)}
          >
            Choose Card
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Dynastic Marriage: pick an ally ───────────────────────────────────────
  if (choice.allyOptions) {
    return (
      <Dialog open maxWidth="sm" fullWidth>
        <DialogTitle>Dynastic Marriage</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Choose a kingdom to form an alliance with. Both gain +3 VP and
            cannot attack each other.
          </Typography>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {choice.allyOptions.map((id) => {
              const player = props.G.playerInfo[id];
              return (
                <Chip
                  key={id}
                  label={player.kingdomName}
                  onClick={() => setSelected(id)}
                  variant={selected === id ? "filled" : "outlined"}
                  color={selected === id ? "primary" : "default"}
                  sx={{
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "4px",
                    backgroundColor:
                      selected === id ? player.colour : undefined,
                    color: selected === id ? "white" : undefined,
                  }}
                />
              );
            })}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="primary"
            disabled={!selected}
            onClick={() => props.moves.resolveEventChoice(selected)}
          >
            Form Alliance
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Colonial Rebellion: pick a colony ─────────────────────────────────────
  if (choice.colonyOptions) {
    return (
      <Dialog open maxWidth="sm" fullWidth>
        <DialogTitle>Colonial Rebellion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Colonists are rising up! Choose which colony faces the rebellion:
          </Typography>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {choice.colonyOptions.map(([x, y]) => {
              const land = props.G.mapState.currentTileArray[y][x];
              const isSelected =
                selected && selected[0] === x && selected[1] === y;
              return (
                <Chip
                  key={`${x},${y}`}
                  label={land.name}
                  onClick={() => setSelected([x, y])}
                  variant={isSelected ? "filled" : "outlined"}
                  color={isSelected ? "warning" : "default"}
                  sx={{ cursor: "pointer", fontSize: "14px", padding: "4px" }}
                />
              );
            })}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="warning"
            disabled={!selected}
            onClick={() => props.moves.resolveEventChoice(selected)}
          >
            Choose Colony
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return null;
};

export default EventChoiceDialog;
