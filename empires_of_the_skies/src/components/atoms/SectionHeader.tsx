/**
 * SectionHeader — small-caps brass heading with a fading rule.
 *
 * One definition for every grouped surface in the frame: the action board's
 * groups, the dock's card/shipyard/fleet groups, and the Trade panel's
 * sections. It was copy-pasted into four files with slightly different
 * weights and letter-spacing, so the same heading looked subtly different
 * depending on which panel you were reading.
 */
import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";

export const SectionHeader = ({
  label,
  action,
  sx,
}: {
  label: string;
  /** Optional control that belongs to this group, sat on the rule */
  action?: ReactNode;
  sx?: object;
}) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`, minWidth: 0, ...sx }}>
    <Typography
      noWrap
      sx={{
        fontFamily: tokens.font.accent,
        fontSize: tokens.fontSize.xs,
        fontWeight: 700,
        color: tokens.ui.gold,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {label}
    </Typography>
    <Box sx={{ flex: 1, height: "1px", minWidth: 8, background: `linear-gradient(90deg, ${tokens.ui.gold}44, transparent)` }} />
    {action}
  </Box>
);
