/**
 * ActionBoard shared — unified brass panel styling.
 *
 * Same visual DNA as CollapsedActionRow:
 * dark surface, gold left edge, display font labels, body font meta.
 */
import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { MyGameProps } from "@eots/game";

export interface ActionBoardProps extends MyGameProps {}

// ── Shared tooltip config ────────────────────────────────────────────────

/** Standard tooltip delays — change here to update all action tooltips */
export const TOOLTIP_DELAY = { enter: 700, enterNext: 400 } as const;

// ── Shared rich tooltip for action rows ─────────────────────────────────

import { ACTION_INFO } from "../ActionHoverContext";

/** Build rich tooltip content for an action ID */
export const ActionTooltipContent = ({ actionId }: { actionId: string }) => {
  const info = ACTION_INFO[actionId];
  if (!info) return null;
  return (
    <Box sx={{ p: 0.5, maxWidth: 260 }}>
      <Typography sx={{ fontFamily: tokens.font.display, fontSize: 13, fontWeight: 700, color: tokens.ui.text, lineHeight: 1.3 }}>
        {info.title}
      </Typography>
      {info.cost && (
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 11, color: tokens.ui.gold, fontWeight: 600, mt: 0.25 }}>
          Cost: {info.cost}
        </Typography>
      )}
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: 11, color: tokens.ui.text, lineHeight: 1.4, mt: 0.5 }}>
        {info.description}
      </Typography>
    </Box>
  );
};

// ── RowHeader — gold-edged label plate ────────────────────────────────────

export const RowHeader = ({
  label,
  meta,
  badges,
}: {
  label: string;
  meta?: Array<{ label: string; value: string }>;
  badges?: string[];
  accent?: string; // kept for API compat but ignored — always gold
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: `${tokens.spacing.xs}px`,
      maxWidth: "100%",
      pl: `${tokens.spacing.sm}px`,
      py: `${tokens.spacing.xs}px`,
    }}
  >
    <Typography
      sx={{
        fontFamily: tokens.font.display,
        fontWeight: 700,
        lineHeight: 1.15,
        fontSize: tokens.fontSize.sm,
        color: tokens.ui.text,
      }}
    >
      {label}
    </Typography>

    {meta && meta.length > 0 && (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {meta.map((item) => (
          <Typography
            key={`${item.label}-${item.value}`}
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.xs,
              lineHeight: 1.3,
              color: tokens.ui.textMuted,
            }}
          >
            <Box
              component="span"
              sx={{ fontWeight: 700, color: `${tokens.ui.gold}cc`, mr: "4px" }}
            >
              {item.label}:
            </Box>
            {item.value}
          </Typography>
        ))}
      </Box>
    )}

    {badges && badges.length > 0 && (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
        {badges.map((badge, i) => (
          <Box
            key={`${badge}-${i}`}
            component="span"
            sx={{
              fontSize: tokens.fontSize.xs,
              fontFamily: tokens.font.body,
              fontWeight: 600,
              border: `1px solid ${tokens.ui.gold}33`,
              borderRadius: `${tokens.radius.pill}px`,
              px: `${tokens.spacing.sm}px`,
              py: "1px",
              backgroundColor: `${tokens.ui.gold}0a`,
              color: tokens.ui.gold,
              lineHeight: 1.4,
            }}
          >
            {badge}
          </Box>
        ))}
      </Box>
    )}
  </Box>
);

// ── ActionRow — expanded panel station ────────────────────────────────────

export const ActionRow = ({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", lg: "260px minmax(0, 1fr)" },
      columnGap: `${tokens.spacing.md}px`,
      rowGap: `${tokens.spacing.sm}px`,
      alignItems: "center",
      mb: "2px",
      px: `${tokens.spacing.md}px`,
      py: `${tokens.spacing.sm}px`,

      // Unified panel surface — matches CollapsedActionRow
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
        background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
      },

      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(80,60,30,0.10)`,

      transition: `all ${tokens.transition.fast}`,
      "&:hover": {
        borderColor: `${tokens.ui.gold}22`,
        background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surfaceHover} 100%)`,
        "&::before": {
          background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}88 60%, ${tokens.ui.gold}22 100%)`,
        },
      },
    }}
  >
    <Box sx={{ minWidth: 0 }}>{header}</Box>
    <Box
      sx={{
        display: "flex",
        flexWrap: "nowrap",
        gap: `${tokens.spacing.sm}px`,
        alignItems: "flex-start",
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  </Box>
);
