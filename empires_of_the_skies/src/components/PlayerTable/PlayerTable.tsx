import React from "react";
import { MyGameProps } from "@eots/game";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import { colourToKingdomMap } from "@eots/game";
import { colors } from "../../designTokens";

const tableHeaderCellSx = { 
  fontWeight: "bold",
  whiteSpace: "nowrap",
  color: "text.secondary",
} as const;

const PlayerTable = (props: PlayerTableProps) => {
  return (
    <TableContainer 
      component={Paper} 
      elevation={2} 
      sx={{ maxWidth: 1230, borderRadius: 2, overflowX: "auto" }}
    >
      {/* Added mb: 2 (16px margin-bottom) here to create space for the scrollbar */}
      <Table size="small" aria-label="player statistics table" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
            <TableCell sx={tableHeaderCellSx}>Kingdom</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Counsellors</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Gold</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Skyships</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Regiments</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Levies</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Fortune Cards</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Prisoners</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Cathedrals</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Palaces</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Shipyards</TableCell>
            <TableCell align="center" sx={tableHeaderCellSx}>Allegiance</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Victory Points</TableCell>
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
                        borderColor: "purple", 
                        color: "purple", 
                        height: 20, 
                        fontSize: "0.7rem",
                        fontWeight: "bold"
                      }} 
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
              
              <TableCell align="center">
                <Chip
                  label={value.hereticOrOrthodox}
                  size="small"
                  sx={{
                    backgroundColor:
                      value.hereticOrOrthodox === "orthodox"
                        ? colors.orthodox
                        : colors.heresy,
                    color: colors.white,
                    textTransform: "capitalize",
                    fontWeight: "bold",
                    minWidth: 80,
                  }}
                />
              </TableCell>
              
              <TableCell align="right">
                <Typography variant="body2" fontWeight="bold">
                  {value.resources.victoryPoints}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

interface PlayerTableProps extends MyGameProps {}

export default PlayerTable;