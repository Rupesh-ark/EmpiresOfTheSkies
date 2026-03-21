/**
 * CollapsedActionRow — compact single-action strip.
 *
 * Layout: [Gold edge | Thumbnail (feathered) | Label | Slot count + dots]
 * Hovering sets the action ID in context so the info panel shows details.
 */
import { Box, Tooltip, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { PlayerDot } from "@/components/atoms/PlayerDot";
import { useActionHover } from "../ActionHoverContext";

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
  bgImage?: string;
  /** Action ID for hover info panel */
  actionId?: string;
}

const THUMB_W = 56;

export const CollapsedActionRow = ({
  label,
  images,
  totalSlots,
  slotState,
  onPlace,
  disabled,
  disabledReason,
  playerInfo,
  bgImage,
  actionId,
}: CollapsedActionRowProps) => {
  const { setHoveredAction } = useActionHover();

  let nextSlot: number | null = null;
  for (let i = 0; i < totalSlots; i++) {
    if (!slotState[i + 1]) {
      nextSlot = i;
      break;
    }
  }

  const allFilled = nextSlot === null;
  const isDisabled = disabled || allFilled;

  const placedCount = Object.values(slotState).filter(Boolean).length;

  const handleClick = () => {
    if (!isDisabled && nextSlot !== null) onPlace(nextSlot);
  };

  const row = (
    <Box
      onClick={handleClick}
      onMouseEnter={() => actionId && setHoveredAction(actionId)}
      onMouseLeave={() => setHoveredAction(null)}
      sx={{
        display: "flex",
        alignItems: "center",
        height: 60,
        position: "relative" as const,
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
            backgroundColor: tokens.ui.surfaceHover,
            boxShadow: `0 0 6px ${tokens.ui.gold}10`,
            "&::before": {
              background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}88 60%, ${tokens.ui.gold}22 100%)`,
            },
          },
          "&:active": { transform: "scale(0.998)" },
        }),
      }}
    >
      {/* ── Thumbnail with feathered right edge ────────── */}
      {bgImage && (
        <Box
          sx={{
            width: THUMB_W,
            alignSelf: "stretch",
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
            ml: "3px",
          }}
        >
          <Box
            component="img"
            src={bgImage}
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

      {/* ── Label ────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0, pl: bgImage ? 0 : `${tokens.spacing.md}px` }}>
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

      {/* ── Slot count + counsellor dots ──────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          flexShrink: 0,
          pr: `${tokens.spacing.sm}px`,
        }}
      >
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: 10,
            color: tokens.ui.textMuted,
            fontWeight: 600,
          }}
        >
          {placedCount}/{totalSlots}
        </Typography>
        {Array.from({ length: totalSlots }).map((_, i) => {
          const slotPid = slotState[i + 1];
          const info = slotPid ? playerInfo[slotPid] : null;
          return info ? (
            <PlayerDot
              key={i}
              colour={info.colour}
              initial={info.kingdomName[0]}
              size="sm"
              tooltip={info.kingdomName}
            />
          ) : (
            <Box
              key={i}
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: `1.5px solid ${tokens.ui.borderMedium}`,
                backgroundColor: `${tokens.ui.surface}88`,
              }}
            />
          );
        })}
      </Box>
    </Box>
  );

  if (isDisabled && (disabledReason || allFilled)) {
    return (
      <Tooltip title={disabledReason ?? "All slots filled"} placement="top" arrow>
        <span
          style={{ display: "block" }}
          onMouseEnter={() => actionId && setHoveredAction(actionId)}
          onMouseLeave={() => setHoveredAction(null)}
        >
          {row}
        </span>
      </Tooltip>
    );
  }

  return row;
};
