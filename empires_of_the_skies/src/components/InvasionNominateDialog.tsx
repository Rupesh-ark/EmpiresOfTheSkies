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

const InvasionNominateDialog = (props: MyGameProps) => {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const invasion = props.G.currentInvasion;
  if (!invasion || invasion.phase !== "nominate") return null;

  // Only the Archprelate can nominate
  const isArchprelate =
    props.G.playerInfo[props.playerID ?? ""]?.isArchprelate;
  if (!isArchprelate || props.ctx.currentPlayer !== props.playerID) return null;

  // Eligible nominees: Orthodox if any exist, otherwise all players
  const hasOrthodox = props.ctx.playOrder.some(
    (id) => props.G.playerInfo[id].hereticOrOrthodox === "orthodox"
  );
  const eligible = props.ctx.playOrder.filter(
    (id) => !hasOrthodox || props.G.playerInfo[id].hereticOrOrthodox === "orthodox"
  );

  return (
    <Dialog open maxWidth="sm" fullWidth>
      <DialogTitle>Infidel Invasion!</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            p: 2,
            mb: 2,
            backgroundColor: "rgba(255, 112, 67, 0.08)",
            borderRadius: 1,
          }}
        >
          <Chip
            label={`Infidel Host: ${invasion.totalHostSwords} Swords`}
            color="error"
            sx={{ fontWeight: "bold" }}
          />
        </Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          As Archprelate, nominate the Captain-General to lead the Grand Army
          of the Faith.
          {hasOrthodox && " The Captain-General must be Orthodox."}
        </Typography>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {eligible.map((id) => {
            const player = props.G.playerInfo[id];
            return (
              <Chip
                key={id}
                label={player.kingdomName}
                onClick={() => setSelected(id)}
                variant={selected === id ? "filled" : "outlined"}
                sx={{
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "4px",
                  backgroundColor:
                    selected === id ? player.colour : undefined,
                  color:
                    selected === id
                      ? player.colour === "#F5DE48"
                        ? "#333"
                        : "white"
                      : undefined,
                }}
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
          onClick={() => props.moves.nominateCaptainGeneral(selected)}
        >
          Nominate Captain-General
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvasionNominateDialog;
