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

const KINGDOM_SLOT_MAP: Record<string, number> = {
  Angland: 1,
  Gallois: 2,
  Castillia: 3,
  Zeeland: 4,
  Venoa: 5,
  Nordmark: 6,
  Ostreich: 7,
  Constantium: 8,
};

const colHeaderCellSx = {
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: "text.secondary",
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: 0.5,
} as const;

const NprKingdomTable = (props: MyGameProps) => {
  const nprKingdoms = Object.keys(props.G.nprCathedrals);
  // Also include Zeeland/Venoa (republics, always NPR) if not already listed
  const republics = ["Zeeland", "Venoa"];
  const allNpr = [
    ...nprKingdoms,
    ...republics.filter((r) => !nprKingdoms.includes(r)),
  ];

  if (allNpr.length === 0) return null;

  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: 1230,
        mb: 3,
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          background:
            "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
          px: 2,
          py: 1,
          width: "100%",
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: "white",
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            fontSize: "0.75rem",
          }}
        >
          Non-Player Kingdoms
        </Typography>
      </Box>
      <Box sx={{ overflowX: "auto" }}>
        <Table
          size="small"
          aria-label="NPR kingdoms table"
          sx={{ mb: 2, "& td, & th": { fontSize: "0.875rem" } }}
        >
          <TableHead>
            <TableRow sx={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
              <TableCell sx={colHeaderCellSx}>Kingdom</TableCell>
              <TableCell align="right" sx={colHeaderCellSx}>
                Cathedrals
              </TableCell>
              <TableCell align="center" sx={colHeaderCellSx}>
                Alignment
              </TableCell>
              <TableCell sx={colHeaderCellSx}>Prelate Controlled By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allNpr.map((kingdom) => {
              const isHeretic =
                props.G.eventState.nprHeretic.includes(kingdom);
              const cathedrals = props.G.nprCathedrals[kingdom] ?? 0;
              const slot =
                KINGDOM_SLOT_MAP[kingdom] as keyof typeof props.G.boardState.influencePrelates;
              const controllerID = props.G.boardState.influencePrelates[slot];
              const controllerName = controllerID
                ? props.G.playerInfo[controllerID]?.kingdomName ?? controllerID
                : null;
              const isRepublic =
                kingdom === "Zeeland" || kingdom === "Venoa";

              return (
                <TableRow
                  key={kingdom}
                  hover
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                  }}
                >
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "medium" }}
                      >
                        {kingdom}
                      </Typography>
                      {isRepublic && (
                        <Chip
                          label="Republic"
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: "#607D8B",
                            color: "#607D8B",
                            height: 20,
                            fontSize: "0.65rem",
                            fontWeight: "bold",
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={
                      isHeretic
                        ? {
                            color: "text.disabled",
                            textDecoration: "line-through",
                          }
                        : {}
                    }
                  >
                    {cathedrals > 0 ? cathedrals : "\u2014"}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={isHeretic ? "Heretic" : "Orthodox"}
                      size="small"
                      sx={{
                        backgroundColor: isHeretic ? "#E77B00" : "#A74383",
                        color: "white",
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: "bold",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: controllerName ? "text.primary" : "text.disabled" }}>
                      {controllerName ?? "Uninfluenced"}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

export default NprKingdomTable;
