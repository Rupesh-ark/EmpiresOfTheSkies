/**
 * Holdings — Buildings, territories, and titles owned by a player.
 *
 * Two-column grid layout with game-icons.net icons (via react-icons/gi).
 * Shared between PlayerBoardFull and PlayerBoardCompact.
 * Stretches via flex-grow to fill remaining sidebar space.
 */
import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { tokens, IconCathedral, IconPalace, IconShipyard, IconFactory, IconPrisoner, IconOutpost, IconColony, IconFort } from "@/theme";
import { MyGameProps } from "@eots/game";
import { getLocationPresentation } from "@/utils/locationLabels";

// ── Count outposts, colonies, and forts from the map ────────────────────

function countTerritories(props: MyGameProps, playerColour: string) {
  let outposts = 0;
  let colonies = 0;
  let forts = 0;
  const locations: { type: string; name: string; ref: string }[] = [];

  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 8; x++) {
      const tile = props.G.mapState.buildings[y][x];
      if (tile.player?.colour === playerColour) {
        const loc = getLocationPresentation(props.G.mapState.currentTileArray, [y, x]);
        if (tile.buildings === "outpost") {
          outposts++;
          locations.push({ type: "Outpost", name: loc.name, ref: loc.reference });
        }
        if (tile.buildings === "colony") {
          colonies++;
          locations.push({ type: "Colony", name: loc.name, ref: loc.reference });
        }
        if (tile.fort) {
          forts++;
        }
      }
    }
  }

  return { outposts, colonies, forts, locations };
}

// ── Holdings row — icon + count + label ─────────────────────────────────

const HoldingRow = ({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: `${tokens.spacing.xs}px`,
      px: `${tokens.spacing.xs}px`,
      py: "3px",
      borderRadius: `${tokens.radius.sm}px`,
      opacity: value === 0 ? 0.35 : 1,
      transition: `opacity ${tokens.transition.fast}`,
    }}
  >
    <Box sx={{ color: tokens.ui.gold, display: "flex", flexShrink: 0, fontSize: 18 }}>
      {icon}
    </Box>
    <Typography
      sx={{
        fontSize: tokens.fontSize.sm,
        fontFamily: tokens.font.body,
        fontWeight: 700,
        color: tokens.ui.text,
        lineHeight: 1,
        minWidth: 14,
      }}
    >
      {value}
    </Typography>
    <Typography
      sx={{
        fontSize: tokens.fontSize.xs,
        fontFamily: tokens.font.body,
        color: tokens.ui.textMuted,
        lineHeight: 1,
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ── Section header ──────────────────────────────────────────────────────

const HoldingsHeader = ({ label }: { label: string }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: `${tokens.spacing.xs}px`,
      mb: `${tokens.spacing.xs}px`,
    }}
  >
    <Box
      sx={{
        height: "1px",
        width: 8,
        background: `linear-gradient(90deg, transparent, ${tokens.ui.gold})`,
        flexShrink: 0,
      }}
    />
    <Typography
      sx={{
        fontFamily: tokens.font.accent,
        fontSize: 10,
        fontWeight: 600,
        color: tokens.ui.gold,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>
    <Box
      sx={{
        height: "1px",
        flex: 1,
        background: `linear-gradient(90deg, ${tokens.ui.gold}, transparent)`,
      }}
    />
  </Box>
);

// ── Main component ──────────────────────────────────────────────────────

interface HoldingsProps extends MyGameProps {
  variant?: "compact" | "full";
}

export const Holdings = (props: HoldingsProps) => {
  const playerInfo = props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const colour = playerInfo.colour;
  const { outposts, colonies, forts, locations } = countTerritories(props, colour);

  return (
    <Box
      sx={{
        px: `${tokens.spacing.sm}px`,
        py: `${tokens.spacing.xs}px`,
        flex: 1,
        minHeight: 0,
      }}
    >
      <HoldingsHeader label="Holdings" />

      {/* 2-column grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1px",
          mb: `${tokens.spacing.xs}px`,
        }}
      >
        <HoldingRow icon={<IconCathedral />} value={playerInfo.cathedrals} label="Cathedrals" />
        <HoldingRow icon={<IconPalace />} value={playerInfo.palaces} label="Palaces" />
        <HoldingRow icon={<IconShipyard />} value={playerInfo.shipyards} label="Shipyards" />
        <HoldingRow icon={<IconFactory />} value={playerInfo.factories} label="Factories" />
        <HoldingRow icon={<IconPrisoner />} value={playerInfo.prisoners} label="Prisoners" />
        <HoldingRow icon={<IconOutpost />} value={outposts} label="Outposts" />
        <HoldingRow icon={<IconColony />} value={colonies} label="Colonies" />
        <HoldingRow icon={<IconFort />} value={forts} label="Forts" />
      </Box>

      {/* Territory locations */}
      {locations.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {locations.map((loc, i) => (
            <Typography
              key={i}
              sx={{
                fontSize: 10,
                fontFamily: tokens.font.body,
                color: tokens.ui.textMuted,
                lineHeight: 1.4,
              }}
            >
              {loc.type}: {loc.name} [{loc.ref}]
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};
