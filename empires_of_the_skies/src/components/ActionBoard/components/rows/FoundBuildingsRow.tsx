/**
 * FoundBuildingsRow — 4 individual building cells in a single horizontal row.
 */
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { BTN_BG } from "@/assets/actionBoard";
import { clearMoves } from "@/utils/gameHelpers";
import { PlayerDot } from "@/components/atoms/PlayerDot";
import { ActionBoardProps } from "../shared";
import { useActionHover } from "../../ActionHoverContext";

const THUMB_W = 48;

const BUILDINGS = [
  { label: "Cathedral", index: 0, key: 1, bg: BTN_BG.cathedral, actionId: "cathedral" },
  { label: "Palace",    index: 1, key: 2, bg: BTN_BG.palace,    actionId: "palace" },
  { label: "Shipyard",  index: 2, key: 3, bg: BTN_BG.shipyard,  actionId: "shipyard" },
  { label: "Fort",      index: 3, key: 4, bg: BTN_BG.fort,      actionId: "fort" },
] as const;

const BuildingCell = ({
  label,
  counsellors,
  playerInfo,
  onClick,
  bg,
  actionId,
}: {
  label: string;
  counsellors: string[];
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
  onClick: () => void;
  bg?: string;
  actionId: string;
}) => {
  const { setHoveredAction } = useActionHover();

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHoveredAction(actionId)}
      onMouseLeave={() => setHoveredAction(null)}
      sx={{
        display: "flex",
        alignItems: "center",
        height: 52,
        flex: 1,
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
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
          transition: `background ${tokens.transition.fast}`,
        },
        cursor: "pointer",
        transition: `all ${tokens.transition.fast}`,
        "&:hover": {
          borderColor: `${tokens.ui.gold}33`,
          backgroundColor: tokens.ui.surfaceHover,
          boxShadow: `0 0 6px ${tokens.ui.gold}10`,
          "&::before": {
            background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}88 60%, ${tokens.ui.gold}22 100%)`,
          },
        },
        "&:active": { transform: "scale(0.998)" },
      }}
    >
      {/* Feathered thumbnail */}
      {bg && (
        <Box
          sx={{
            width: THUMB_W,
            alignSelf: "stretch",
            flexShrink: 0,
            overflow: "hidden",
            ml: "3px",
          }}
        >
          <Box
            component="img"
            src={bg}
            alt=""
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
              maskImage: "linear-gradient(to right, black 50%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, black 50%, transparent 100%)",
            }}
          />
        </Box>
      )}

      {/* Label */}
      <Box sx={{ flex: 1, minWidth: 0, pl: bg ? 0 : `${tokens.spacing.md}px`, pr: `${tokens.spacing.sm}px` }}>
        <Typography
          noWrap
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.fontSize.sm,
            color: tokens.ui.text,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
      </Box>

      {/* Counsellor dots */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: `${tokens.spacing.xs}px`,
          flexShrink: 0,
          pr: `${tokens.spacing.sm}px`,
        }}
      >
        {counsellors.length > 0 && (
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: 10,
              color: tokens.ui.textMuted,
              fontWeight: 600,
            }}
          >
            {counsellors.length}
          </Typography>
        )}
        {counsellors.map((pid, i) => {
          const info = playerInfo[pid];
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
    </Box>
  );
};

const FoundBuildingsRow = (props: ActionBoardProps) => (
  <Box sx={{ display: "flex", gap: "6px" }}>
    {BUILDINGS.map((b) => {
      const counsellors = (props.G.boardState.foundBuildings[
        b.key as keyof typeof props.G.boardState.foundBuildings
      ] as string[]) ?? [];
      return (
        <BuildingCell
          key={b.label}
          label={b.label}
          counsellors={counsellors}
          playerInfo={props.G.playerInfo}
          bg={b.bg}
          actionId={b.actionId}
          onClick={() => {
            clearMoves(props);
            props.moves.foundBuildings(b.index);
          }}
        />
      );
    })}
  </Box>
);

export default FoundBuildingsRow;
