import React from "react";
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  Paper,
  TableBody,
  TableHead,
} from "@mui/material";
import { MyGameProps } from "@eots/game";
const HeresyTracker = (props: HeresyTrackerProps) => {
  const tableRows = Object.values(props.G.playerInfo).map((player) => {
    const tableCells: JSX.Element[] = [];
    for (let i = -11; i < 13; i++) {
      tableCells.push(
        <TableCell
          sx={{
            backgroundColor:
              player.heresyTracker === i ? player.colour : "white",
          }}
          key={`heresy tracker cell - ${i}`}
        ></TableCell>
      );
    }
    return <TableRow>{tableCells}</TableRow>;
  });
  return (
    <TableContainer component={Paper} style={{ maxWidth: 1230, marginTop: 20 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              9
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              8
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              7
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              6
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              5
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              4
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              3
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              2
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              1
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -1
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -2
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -3
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -4
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -5
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -6
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -7
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -8
            </TableCell>
            <TableCell sx={{ backgroundColor: "#A74383", color: "white" }}>
              -9
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -9
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -8
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -7
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -6
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -5
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -4
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -3
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -2
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              -1
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              0
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              1
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              2
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              3
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              4
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              5
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              6
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              7
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              8
            </TableCell>
            <TableCell sx={{ backgroundColor: "#E77B00", color: "white" }}>
              9
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{tableRows}</TableBody>
      </Table>
    </TableContainer>
  );
};

interface HeresyTrackerProps extends MyGameProps {}
export default HeresyTracker;
