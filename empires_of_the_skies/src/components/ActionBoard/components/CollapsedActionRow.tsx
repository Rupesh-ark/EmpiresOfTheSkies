/**
 * CollapsedActionRow — compact single-action strip.
 *
 * Layout: [Gold edge | Label + cost | Artwork thumb | Slot count + dots]
 * Artwork is a small thumbnail, not a stretched viewport.
 */
import { Box, Tooltip, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { PlayerDot } from "@/components/atoms/PlayerDot";

export interface CollapsedActionRowProps {
  label: string;
  cost: string;
  images: string[];
  totalSlots: number;
  slotState: Record<number, string | undefined>;
  onPlace: (slotIndex: number) => void;
  disabled?: boolean;
  disabledReason?: string;
  accent?: string;
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
}

export const CollapsedActionRow = ({
  label,
  cost,
  images,
  totalSlots,
  slotState,
  onPlace,
  disabled,
  disabledReason,
  playerInfo,
}: CollapsedActionRowProps) => {
  let nextSlot: number | null = null;
  for (let i = 0; i < totalSlots; i++) {
    if (!slotState[i + 1]) {
      nextSlot = i;
      break;
    }
  }

  const allFilled = nextSlot === null;
  const isDisabled = disabled || allFilled;

  // Placed counsellor dots
  const placedDots = Object.entries(slotState)
    .filter(([, pid]) => pid !== undefined)
    .map(([key, pid]) => {
      const info = playerInfo[pid!];
      if (!info) return null;
      return (
        <PlayerDot
          key={key}
          colour={info.colour}
          initial={info.kingdomName[0]}
          size="sm"
          tooltip={info.kingdomName}
        />
      );
    })
    .filter(Boolean);

  // Show image for next available slot
  const displayImage = images[nextSlot ?? totalSlots - 1];

  const handleClick = () => {
    if (!isDisabled && nextSlot !== null) onPlace(nextSlot);
  };

  const row = (
    <Box
      onClick={handleClick}
      sx={{
        display: "flex",
        alignItems: "center",
        height: 48,
        px: `${tokens.spacing.md}px`,
        gap: `${tokens.spacing.md}px`,
        mb: "2px",

        // Unified panel surface
        position: "relative" as const,
        background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
        borderRadius: `${tokens.radius.md}px`,
        border: `1px solid ${tokens.ui.border}`,
        borderLeft: "3px solid transparent",
        borderTop: `1px solid ${tokens.ui.gold}12`,

        // Gradient gold left accent
        "&::before": {
          content: '""',
          position: "absolute",
          left: -3,
          top: 0,
          bottom: 0,
          width: 3,
          borderRadius: `${tokens.radius.md}px 0 0 ${tokens.radius.md}px`,
          background: isDisabled
            ? `linear-gradient(180deg, ${tokens.ui.gold}44 0%, ${tokens.ui.gold}22 60%, transparent 100%)`
            : `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
          transition: `background ${tokens.transition.fast}`,
        },

        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.45 : 1,
        transition: `all ${tokens.transition.fast}`,
        ...(!isDisabled && {
          "&:hover": {
            borderColor: `${tokens.ui.gold}33`,
            background: `linear-gradient(180deg, ${tokens.ui.surfaceHover} 0%, ${tokens.ui.surfaceRaised} 100%)`,
            boxShadow: `0 0 6px ${tokens.ui.gold}10`,
            "&::before": {
              background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}88 60%, ${tokens.ui.gold}22 100%)`,
            },
          },
          "&:active": { transform: "scale(0.998)" },
        }),
      }}
    >
      {/* ── Label + cost ────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.fontSize.sm,
            color: tokens.ui.text,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            lineHeight: 1.2,
          }}
        >
          {cost}
        </Typography>
      </Box>

      {/* TODO: Replace with proper SVG artwork images when available.
       * Use the `images` prop — each slot has a corresponding image.
       * displayImage = images[nextSlot ?? totalSlots - 1]
       * Render as: <Box sx={{ backgroundImage: `url(${displayImage})`, ... }} />
       */}

      {/* ── Slot count + counsellor dots ──────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: `${tokens.spacing.xs}px`,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            fontWeight: 600,
          }}
        >
          {placedDots.length}/{totalSlots}
        </Typography>
        {placedDots.length > 0
          ? placedDots
          : Array.from({ length: Math.min(totalSlots, 3) }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: `1px solid ${tokens.ui.borderMedium}`,
                }}
              />
            ))}
      </Box>
    </Box>
  );

  if (isDisabled && (disabledReason || allFilled)) {
    return (
      <Tooltip title={disabledReason ?? "All slots filled"} placement="top" arrow>
        <span style={{ display: "block" }}>{row}</span>
      </Tooltip>
    );
  }

  return row;
};
