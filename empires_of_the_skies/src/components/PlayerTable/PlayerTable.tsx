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
} from "@mui/material";
import { colourToKingdomMap } from "@eots/game";
import { colors } from "../../designTokens";

const tableHeaderCellSx = { fontWeight: "bold" } as const;

const PlayerTable = (props: PlayerTableProps) => {
  return (
    <TableContainer component={Paper} sx={{ maxWidth: 1230 }}>
      <Table size="medium">
        <TableHead>
          <TableRow>
            <TableCell sx={tableHeaderCellSx}>Kingdom</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Counsellors</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Gold</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Skyships</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Regiments</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Levies</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Fortune Of War Cards</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Prisoners</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Cathedrals</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Palaces</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Shipyards</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Allegiance</TableCell>
            <TableCell align="right" sx={tableHeaderCellSx}>Victory Points</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(props.G.playerInfo).map(([key, value]) => (
            <TableRow key={key}>
              <TableCell
                sx={{
                  backgroundColor: value.colour,
                  border: value.isArchprelate ? "5px solid purple" : undefined,
                }}
              >
                {colourToKingdomMap[value.colour]}
              </TableCell>
              <TableCell align="right">{value.resources.counsellors}</TableCell>
              <TableCell align="right">{value.resources.gold}</TableCell>
              <TableCell align="right">{value.resources.skyships}</TableCell>
              <TableCell align="right">{value.resources.regiments}</TableCell>
              <TableCell align="right">{value.resources.levies}</TableCell>
              <TableCell align="right">
                {value.resources.fortuneCards.length}
              </TableCell>
              <TableCell align="right">{value.prisoners}</TableCell>
              <TableCell align="right">{value.cathedrals}</TableCell>
              <TableCell align="right">{value.palaces}</TableCell>
              <TableCell align="right">{value.shipyards}</TableCell>
              <TableCell
                align="right"
                sx={{
                  backgroundColor:
                    value.hereticOrOrthodox === "orthodox"
                      ? colors.orthodox
                      : colors.heresy,
                  color: colors.white,
                }}
              >
                {value.hereticOrOrthodox}
              </TableCell>
              <TableCell align="right">
                {value.resources.victoryPoints}
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
