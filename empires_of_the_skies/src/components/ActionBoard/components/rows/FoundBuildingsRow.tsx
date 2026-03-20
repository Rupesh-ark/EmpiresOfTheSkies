import { ActionBoardProps } from "../shared";
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { clearMoves } from "@/utils/gameHelpers";
import { PlayerDot } from "@/components/atoms/PlayerDot";

const BUILDINGS = [
  { label: "Cathedral", cost: "5g", index: 0 },
  { label: "Palace", cost: "5g", index: 1 },
  { label: "Shipyard", cost: "3g", index: 2 },
  { label: "Fort", cost: "2g", index: 3 },
];

const FoundBuildingsRow = (props: ActionBoardProps) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: `${tokens.spacing.sm}px`,
      mb: "2px",
      px: `${tokens.spacing.md}px`,
      py: `${tokens.spacing.sm}px`,
      position: "relative",
      background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
      borderRadius: `${tokens.radius.md}px`,
      border: `1px solid ${tokens.ui.border}`,
      borderLeft: "3px solid transparent",
      borderTop: `1px solid ${tokens.ui.gold}12`,
      "&::before": {
        content: '""',
        position: "absolute",
        left: -3,
        top: 0,
        bottom: 0,
        width: 3,
        borderRadius: `${tokens.radius.md}px 0 0 ${tokens.radius.md}px`,
        background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
      },
    }}
  >
    {/* Label */}
    <Box sx={{ minWidth: 0, flexShrink: 0 }}>
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontSize: tokens.fontSize.sm,
          color: tokens.ui.text,
          lineHeight: 1.2,
        }}
      >
        Found Buildings
      </Typography>
      <Typography
        sx={{
          fontFamily: tokens.font.body,
          fontSize: tokens.fontSize.xs,
          color: tokens.ui.textMuted,
          lineHeight: 1.2,
        }}
      >
        + row count cost
      </Typography>
    </Box>

    {/* Building buttons as text cards */}
    {/* TODO: Replace text buttons with proper SVG board artwork images */}
    <Box
      sx={{
        display: "flex",
        gap: `${tokens.spacing.sm}px`,
        flex: 1,
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      {BUILDINGS.map((b) => {
        const counsellors = props.G.boardState.foundBuildings[
          (b.index + 1) as keyof typeof props.G.boardState.foundBuildings
        ] as string[] | undefined;
        return (
          <Box
            key={b.label}
            onClick={() => {
              clearMoves(props);
              props.moves.foundBuildings(b.index);
            }}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              px: `${tokens.spacing.md}px`,
              py: `${tokens.spacing.sm}px`,
              borderRadius: `${tokens.radius.md}px`,
              border: `1px solid ${tokens.ui.borderMedium}`,
              backgroundColor: tokens.ui.surfaceHover,
              cursor: "pointer",
              transition: `all ${tokens.transition.fast}`,
              minWidth: 90,
              "&:hover": {
                borderColor: `${tokens.ui.gold}44`,
                backgroundColor: tokens.ui.surfaceRaised,
              },
            }}
          >
            <Typography
              sx={{
                fontFamily: tokens.font.display,
                fontSize: tokens.fontSize.xs,
                color: tokens.ui.text,
                fontWeight: 600,
              }}
            >
              {b.label}
            </Typography>
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: "10px",
                color: tokens.ui.gold,
              }}
            >
              {b.cost}
            </Typography>
            {/* Placed counsellors */}
            {counsellors && counsellors.length > 0 && (
              <Box sx={{ display: "flex", gap: "2px" }}>
                {counsellors.map((pid, i) => {
                  const info = props.G.playerInfo[pid];
                  return info ? (
                    <PlayerDot
                      key={i}
                      colour={info.colour}
                      initial={info.kingdomName[0]}
                      size="sm"
                    />
                  ) : null;
                })}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  </Box>
);

export default FoundBuildingsRow;
