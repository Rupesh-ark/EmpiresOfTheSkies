/**
 * GoodsValue — Supply/demand price lookup.
 *
 * Two modes:
 *   compact: just good name + current gold value (for Trade tab)
 *   full:    full supply/demand grid with all positions (default)
 */
import { Box, Typography } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { tokens } from "@/theme";

const LootIcon = ({ colour }: { colour: string }) => (
  <svg width="14" height="16" viewBox="0 0 28 31" fill="none" style={{ display: "block" }}>
    <path d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
    <path d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
    <path d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z" fill={colour} stroke="#1A1A18" strokeWidth="0.288" strokeMiterlimit="22.9256" />
  </svg>
);

const GOODS = [
  { name: "Mithril",       colour: "#ECEDED", borderColour: "#aaa",    values: [4,4,3,3,2,2,2] },
  { name: "Magic Dust",    colour: "#F6B1B5", borderColour: "#c0485e", values: [4,4,3,3,2,2,2] },
  { name: "Dragon Scales", colour: "#52A6B2", borderColour: "#2e7a85", values: [3,3,3,2,2,2,1,1,1,1,1] },
  { name: "Kraken Skin",   colour: "#B1AC7E", borderColour: "#7a7550", values: [3,3,3,2,2,2,1,1,1,1,1] },
  { name: "Sticky Ichor",  colour: "#008BD2", borderColour: "#005f91", values: [3,3,2,2,2,1,1,1,1,1,1,1] },
  { name: "Pipeweed",      colour: "#AE9675", borderColour: "#7a6650", values: [3,3,2,2,2,1,1,1,1,1,1,1] },
];

const maxCols = Math.max(...GOODS.map((g) => g.values.length));

function useSupplyAmounts(props: MyGameProps) {
  const amounts: number[] = new Array(GOODS.length).fill(0);
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
  return amounts;
}

// ── Compact: just good name + current value ─────────────────────────────

const GoodsValueCompact = ({ props }: { props: MyGameProps }) => {
  const amounts = useSupplyAmounts(props);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {GOODS.map((good, goodIdx) => {
        const supply = amounts[goodIdx];
        const currentValue = good.values[supply] ?? 0;
        const isDark = good.colour === "#ECEDED" || good.colour === "#F6B1B5";

        return (
          <Box
            key={good.name}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: `${tokens.spacing.sm}px`,
              px: `${tokens.spacing.xs}px`,
              py: "3px",
              borderRadius: `${tokens.radius.sm}px`,
              "&:hover": { backgroundColor: tokens.ui.surfaceHover },
            }}
          >
            <LootIcon colour={good.colour} />
            <Typography
              sx={{
                fontSize: tokens.fontSize.xs,
                fontFamily: tokens.font.body,
                fontWeight: 500,
                color: tokens.ui.text,
                flex: 1,
                lineHeight: 1,
              }}
            >
              {good.name}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 28,
                height: 22,
                borderRadius: `${tokens.radius.sm}px`,
                backgroundColor: good.colour,
                border: `1px solid ${good.borderColour}`,
                px: "4px",
              }}
            >
              <Typography
                sx={{
                  fontSize: tokens.fontSize.xs,
                  fontFamily: tokens.font.body,
                  fontWeight: 700,
                  color: isDark ? "#222" : "white",
                  lineHeight: 1,
                }}
              >
                {currentValue}g
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// ── Full: supply/demand grid ────────────────────────────────────────────

const GoodsValueFull = ({ props }: { props: MyGameProps }) => {
  const amounts = useSupplyAmounts(props);

  return (
    <Box>
      <Typography sx={{ fontSize: 10, fontFamily: tokens.font.body, color: tokens.ui.textMuted, mb: `${tokens.spacing.xs}px` }}>
        Highlighted = current supply on the board
      </Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `100px repeat(${maxCols}, 32px)`,
            gap: "1px",
            fontSize: tokens.fontSize.xs,
          }}
        >
          <Box sx={{ fontWeight: 700, color: tokens.ui.textMuted, px: "4px", py: "3px", fontSize: 10 }}>Good</Box>
          {Array.from({ length: maxCols }, (_, i) => (
            <Box key={i} sx={{ textAlign: "center", fontWeight: 700, color: tokens.ui.textMuted, py: "3px", fontSize: 10 }}>
              {i}
            </Box>
          ))}

          {GOODS.map((good, goodIdx) => {
            const current = amounts[goodIdx];
            return [
              <Box key={`name-${good.name}`} sx={{ display: "flex", alignItems: "center", gap: "4px", px: "4px", py: "2px" }}>
                <LootIcon colour={good.colour} />
                <Typography sx={{ fontSize: 11, fontFamily: tokens.font.body, fontWeight: 500, lineHeight: 1 }}>
                  {good.name}
                </Typography>
              </Box>,
              ...Array.from({ length: maxCols }, (_, i) => {
                const val = good.values[i];
                const isActive = i === current;
                const isDefined = val !== undefined;
                return (
                  <Box
                    key={`${good.name}-${i}`}
                    sx={{
                      textAlign: "center",
                      py: "2px",
                      borderRadius: isActive ? `${tokens.radius.sm}px` : 0,
                      backgroundColor: isActive ? good.colour : "transparent",
                      outline: isActive ? `2px solid ${good.borderColour}` : "none",
                      outlineOffset: "-2px",
                      fontWeight: isActive ? 700 : 400,
                      fontSize: 11,
                      fontFamily: tokens.font.body,
                      color: isActive
                        ? (good.colour === "#ECEDED" || good.colour === "#F6B1B5" ? "#222" : "white")
                        : isDefined ? tokens.ui.text : tokens.ui.textMuted,
                    }}
                  >
                    {isDefined ? val : "—"}
                  </Box>
                );
              }),
            ];
          })}
        </Box>
      </Box>
    </Box>
  );
};

// ── Export ───────────────────────────────────────────────────────────────

export const GoodsValue = ({ props, compact }: { props: MyGameProps; compact?: boolean }) => {
  return compact ? <GoodsValueCompact props={props} /> : <GoodsValueFull props={props} />;
};
