import { MyGameProps } from "@eots/game";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import { colourToKingdomMap } from "@eots/game";

const colHeaderCellSx = {
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: "text.secondary",
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: 0.5,
} as const;

const PlayerTable = (props: PlayerTableProps) => {
  return (
    <Paper elevation={2} sx={{ maxWidth: 1230, mb: 3, width: "100%", borderRadius: 2, overflow: "hidden" }}>
      <Box
        sx={{
          background: "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
          px: 2,
          py: 1,
          width: "100%",
        }}
      >
        <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.75rem" }}>
          Player Statistics
        </Typography>
      </Box>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="player statistics table" sx={{ mb: 2, "& td, & th": { fontSize: "0.875rem" } }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
              <TableCell sx={colHeaderCellSx}>Kingdom</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Counsellors</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Gold</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Skyships</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Regiments</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Levies</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Fortune Cards</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Prisoners</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Cathedrals</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Palaces</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Shipyards</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Factories</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>Victory Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(props.G.playerInfo).map(([key, value]) => (
              <TableRow
                key={key}
                hover
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: value.colour,
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                      {colourToKingdomMap[value.colour]}
                    </Typography>
                    {value.isArchprelate && (
                      <Chip
                        label="Archprelate"
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: "#A74383",
                          color: "#A74383",
                          height: 20,
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                        }}
                      />
                    )}
                    {value.isCaptainGeneral && (
                      <Chip
                        label="Captain-General"
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: "#2E7D32",
                          color: "#2E7D32",
                          height: 20,
                          fontSize: "0.65rem",
                          fontWeight: "bold",
                        }}
                      />
                    )}
                    {props.G.eventState.peaceAccordActive && (
                      <Chip
                        label="Peace Accord"
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: "#D4A017", color: "#D4A017", height: 20, fontSize: "0.65rem", fontWeight: "bold" }}
                      />
                    )}
                    {props.G.eventState.dynasticMarriage?.includes(key) && (
                      <Chip
                        label={`Allied: ${
                          props.G.playerInfo[
                            props.G.eventState.dynasticMarriage[0] === key
                              ? props.G.eventState.dynasticMarriage[1]
                              : props.G.eventState.dynasticMarriage[0]
                          ].kingdomName
                        }`}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: "#C06090", color: "#C06090", height: 20, fontSize: "0.65rem", fontWeight: "bold" }}
                      />
                    )}
                    {props.G.eventState.schismAffected.includes(key) && (
                      <Chip
                        label="Schism"
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: "#E77B00", color: "#E77B00", height: 20, fontSize: "0.65rem", fontWeight: "bold" }}
                      />
                    )}
                    {props.G.eventState.lendersRefuseCredit.includes(key) &&
                      value.resources.gold < 0 && (
                      <Chip
                        label="Credit Blocked"
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: "#D32F2F", color: "#D32F2F", height: 20, fontSize: "0.65rem", fontWeight: "bold" }}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">{value.resources.counsellors}</TableCell>
                <TableCell align="right">{value.resources.gold}</TableCell>
                <TableCell align="right">{value.resources.skyships}</TableCell>
                <TableCell align="right">{value.resources.regiments}</TableCell>
                <TableCell align="right">{value.resources.levies}</TableCell>
                <TableCell align="right">{value.resources.fortuneCards.length}</TableCell>
                <TableCell align="right">{value.prisoners}</TableCell>
                <TableCell align="right">{value.cathedrals}</TableCell>
                <TableCell align="right">{value.palaces}</TableCell>
                <TableCell align="right">{value.shipyards}</TableCell>
                <TableCell align="right">{value.factories}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {value.resources.victoryPoints}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

interface PlayerTableProps extends MyGameProps {}

export default PlayerTable;