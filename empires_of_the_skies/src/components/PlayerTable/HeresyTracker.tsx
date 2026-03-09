import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  Paper,
  TableBody,
  TableHead,
  Box,
} from "@mui/material";
import { MyGameProps } from "@eots/game";


const ORTHODOX_TRACK = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0,0, -1, -2, -3, -4, -5, -6, -7, -8, -9];
const HERESY_TRACK = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const HeresyTracker = (props: HeresyTrackerProps) => {
  const trackIndices = Array.from({ length: 24 }, (_, index) => index - 11);

  return (
    <TableContainer component={Paper} elevation={2} sx={{ maxWidth: 1230, mt: 3, mb: 3, borderRadius: 2, overflowX: "auto", pb: 1 }}>
      <Table size="small" sx={{ minWidth: 800 }}>
        <TableHead>
          {/* Orthodox Track Header */}
          <TableRow sx={{ backgroundColor: "#A74383" }}>
            <TableCell sx={{ backgroundColor: "#A74383", position: "sticky", left: 0, zIndex: 1, borderBottom: "none", color: "white", fontWeight: "bold", fontSize: "0.8rem" }}>Orthodox</TableCell>
            {ORTHODOX_TRACK.map((val, index) => (
              <TableCell
                key={`orth-${index}`}
                align="center"
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  borderBottom: "none",
                  py: 1,
                  opacity: val === 0 ? 0.6 : 1
                }}
              >
                {val}
              </TableCell>
            ))}
          </TableRow>

          {/* Heresy Track Header */}
          <TableRow sx={{ backgroundColor: "#E77B00" }}>
            <TableCell sx={{ backgroundColor: "#E77B00", position: "sticky", left: 0, zIndex: 1, color: "white", fontWeight: "bold", fontSize: "0.8rem" }}>Heretic</TableCell>
            {HERESY_TRACK.map((val, index) => (
              <TableCell
                key={`heresy-${index}`}
                align="center"
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  py: 1,
                  opacity: val === 0 ? 0.6 : 1
                }}
              >
                {val}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {Object.entries(props.G.playerInfo).map(([playerId, player]) => (
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
                    "&:last-child": { borderRight: 0 }
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
    </TableContainer>
  );
};

interface HeresyTrackerProps extends MyGameProps {}

export default HeresyTracker;