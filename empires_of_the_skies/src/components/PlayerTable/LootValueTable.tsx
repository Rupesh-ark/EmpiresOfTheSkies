import { MyGameProps } from "@eots/game";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

const LootIcon = ({ colour }: { colour: string }) => (
  <svg width="18" height="20" viewBox="0 0 28 31" fill="none" style={{ display: "block" }}>
    <path d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
    <path d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
    <path d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
  </svg>
);

const GOODS = [
  { name: "Mithril",       colour: "#ECEDED", borderColour: "#aaa", values: [4,4,3,3,2,2,2] },
  { name: "Magic Dust",    colour: "#F6B1B5", borderColour: "#c0485e", values: [4,4,3,3,2,2,2] },
  { name: "Dragon Scales", colour: "#52A6B2", borderColour: "#2e7a85", values: [3,3,3,2,2,2,1,1,1,1,1] },
  { name: "Kraken Skin",   colour: "#B1AC7E", borderColour: "#7a7550", values: [3,3,3,2,2,2,1,1,1,1,1] },
  { name: "Sticky Ichor",  colour: "#008BD2", borderColour: "#005f91", values: [3,3,2,2,2,1,1,1,1,1,1,1] },
  { name: "Pipeweed",      colour: "#AE9675", borderColour: "#7a6650", values: [3,3,2,2,2,1,1,1,1,1,1,1] },
];

const maxCols = Math.max(...GOODS.map(g => g.values.length));

const LootValueTable = (props: MyGameProps) => {
  const amounts: number[] = [];

  for (let i = 0; i < GOODS.length; i++) amounts.push(0);

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      const currentBuilding = props.G.mapState.buildings[y][x].buildings;
      if (currentBuilding) {
        const loot = props.G.mapState.currentTileArray[y][x].loot[currentBuilding];
        amounts[0] += loot.mithril;
        amounts[2] += loot.magicDust;
        amounts[3] += loot.dragonScales;
        amounts[4] += loot.krakenSkin;
        amounts[1] += loot.stickyIchor;
        amounts[5] += loot.pipeweed;
      }
    }
  }

  return (
    <Paper elevation={2} sx={{ maxWidth: 1230, mb: 3, width: "100%", borderRadius: 2, overflow: "hidden" }}>
      <Box
        sx={{
          background: "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
          px: 2,
          py: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
        }}
      >
        <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.75rem" }}>
          Goods to Gold Value
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", ml: 1 }}>
          highlighted cell = current supply on the board
        </Typography>
      </Box>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { fontSize: "0.875rem" } }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
              <TableCell sx={{ fontWeight: "bold", color: "text.secondary", whiteSpace: "nowrap", minWidth: 150 }}>
                Good
              </TableCell>
              {Array.from({ length: maxCols }, (_, i) => (
                <TableCell key={i} align="center" sx={{ fontWeight: "bold", color: "text.secondary", width: 48 }}>
                  {i}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {GOODS.map((good, goodIdx) => {
              const current = amounts[goodIdx];
              return (
                <TableRow key={good.name} hover sx={{ "&:last-child td": { border: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LootIcon colour={good.colour} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {good.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  {Array.from({ length: maxCols }, (_, i) => {
                    const val = good.values[i];
                    const isActive = i === current;
                    const isDefined = val !== undefined;
                    return (
                      <TableCell
                        key={i}
                        align="center"
                        sx={{
                          width: 48,
                          p: 0.5,
                          backgroundColor: isActive ? good.colour : undefined,
                          outline: isActive ? `2px solid ${good.borderColour}` : undefined,
                          outlineOffset: "-2px",
                          borderRadius: isActive ? 1 : 0,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive ? (good.colour === "#ECEDED" || good.colour === "#F6B1B5" ? "#222" : "white") : isDefined ? "text.primary" : "text.disabled",
                          fontSize: "0.875rem",
                          transition: "background-color 0.2s",
                        }}
                      >
                        {isDefined ? val : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
};

export default LootValueTable;