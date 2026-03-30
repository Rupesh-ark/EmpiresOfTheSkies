import {
  Table,
  TableRow,
  TableCell,
  Paper,
  TableBody,
  TableHead,
  Box,
  Typography,
} from "@mui/material";
import { MyGameProps, PlayerInfo } from "@eots/game";


const ORTHODOX_TRACK = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, -1, -2, -3, -4, -5, -6, -7, -8, -9];
const HERESY_TRACK = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const HeresyTracker = (props: HeresyTrackerProps) => {
  const trackIndices = Array.from({ length: 24 }, (_, index) => index - 11);

  return (
    <Paper elevation={2} sx={{ maxWidth: 1230, mb: 3, width: "100%", borderRadius: 2, overflow: "hidden" }}>
      <Box
        sx={{
          background: "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
          px: 2,
          py: 1,
          display: "flex",
          gap: 2,
          alignItems: "center",
          width: "100%",
        }}
      >
        <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.75rem" }}>
          Heresy Tracker
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#A74383" }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.7rem" }}>Orthodox</Typography>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#E77B00", ml: 1 }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", fontSize: "0.7rem" }}>Heretic</Typography>
        </Box>
      </Box>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 800, "& td, & th": { fontSize: "0.875rem" } }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#A74383" }}>
              <TableCell sx={{ backgroundColor: "#A74383", position: "sticky", left: 0, zIndex: 1, borderBottom: "none", color: "white", fontWeight: "bold", fontSize: "0.8rem" }}>Orthodox</TableCell>
              {ORTHODOX_TRACK.map((val, index) => (
                <TableCell
                  key={`orth-${index}`}
                  align="center"
                  sx={{ color: "white", fontWeight: "bold", borderBottom: "none", py: 1, opacity: val === 0 ? 0.6 : 1 }}
                >
                  {val}
                </TableCell>
              ))}
            </TableRow>
            <TableRow sx={{ backgroundColor: "#E77B00" }}>
              <TableCell sx={{ backgroundColor: "#E77B00", position: "sticky", left: 0, zIndex: 1, color: "white", fontWeight: "bold", fontSize: "0.8rem" }}>Heretic</TableCell>
              {HERESY_TRACK.map((val, index) => (
                <TableCell
                  key={`heresy-${index}`}
                  align="center"
                  sx={{ color: "white", fontWeight: "bold", py: 1, opacity: val === 0 ? 0.6 : 1 }}
                >
                  {val}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {(Object.entries(props.G.playerInfo) as [string, PlayerInfo][]).map(([playerId, player]) => (
              <TableRow key={playerId} hover>
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    backgroundColor: "background.paper",
                    borderRight: "2px solid rgba(224, 224, 224, 0.6)",
                    minWidth: 120,
                    py: 0.5,
                    px: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: player.colour, flexShrink: 0 }} />
                    <Box>
                      <Box sx={{ fontSize: "0.75rem", fontWeight: "bold", lineHeight: 1.2 }}>
                        {player.kingdomName}
                      </Box>
                      <Box
                        sx={{
                          fontSize: "0.65rem",
                          color: player.hereticOrOrthodox === "heretic" ? "#E77B00" : "#A74383",
                          fontWeight: 600,
                          textTransform: "capitalize",
                          lineHeight: 1.2,
                        }}
                      >
                        {player.hereticOrOrthodox}
                      </Box>
                    </Box>
                  </Box>
                </TableCell>
                {trackIndices.map((trackIndex) => (
                  <TableCell
                    key={`cell-${playerId}-${trackIndex}`}
                    align="center"
                    sx={{
                      p: 1,
                      borderRight: "1px solid rgba(224, 224, 224, 0.4)",
                      "&:last-child": { borderRight: 0 },
                    }}
                  >
                    {player.heresyTracker === trackIndex && (
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: player.colour,
                          margin: "0 auto",
                          boxShadow: "0px 2px 4px rgba(0,0,0,0.4), inset 0px 2px 2px rgba(255,255,255,0.3)",
                        }}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

interface HeresyTrackerProps extends MyGameProps {}

export default HeresyTracker;