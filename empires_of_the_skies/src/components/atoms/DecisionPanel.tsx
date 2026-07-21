/**
 * DecisionPanel — a non-modal decision card that floats over the map's
 * lower edge instead of blocking the screen. The map stays fully visible
 * and interactive behind it, so players can inspect the battle tile,
 * pan around, and check fleets before committing.
 *
 * Used by DecisionRouter for combat prompts; keep takeover ceremonies
 * (battle results, elections, round summaries) on DialogShell.
 */
import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { tokens, backgrounds } from "@/theme";
import { getMoodTokens } from "@/theme";

interface DecisionPanelProps {
  open: boolean;
  title: string;
  subtitle?: string;
  mood?: "battle" | "peacetime" | "crisis" | "election" | "discovery";
  children: ReactNode;
  /** Right-aligned button row */
  actions?: ReactNode;
  /** Panel width in px — widen for card fans (default 460) */
  width?: number;
}

export const DecisionPanel = ({
  open,
  title,
  subtitle,
  mood = "battle",
  children,
  actions,
  width = 460,
}: DecisionPanelProps) => {
  if (!open) return null;
  const moodTokens = getMoodTokens(mood);

  return (
    <Box
      sx={{
        width,
        maxWidth: "94%",
        maxHeight: "52vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: `${tokens.radius.lg}px`,
        border: `1px solid ${tokens.ui.borderMedium}`,
        borderTop: `3px solid ${moodTokens.accent}`,
        background: backgrounds.parchmentPanelTinted,
        backgroundColor: tokens.ui.surface,
        boxShadow: `0 10px 32px rgba(0,0,0,0.45), 0 0 14px ${moodTokens.accent}22`,
        overflow: "hidden",
        pointerEvents: "auto",
        "@keyframes decisionRise": {
          from: { opacity: 0, transform: "translateY(14px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        animation: `decisionRise ${tokens.transition.normal}`,
      }}
    >
      <Box sx={{ px: `${tokens.spacing.md}px`, pt: `${tokens.spacing.sm}px`, pb: `${tokens.spacing.xs}px`, flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              flexShrink: 0,
              transform: "rotate(45deg)",
              backgroundColor: moodTokens.accent,
              boxShadow: `0 0 8px ${moodTokens.accent}88`,
            }}
          />
          <Typography sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.md, fontWeight: 700, color: tokens.ui.textBright, lineHeight: 1.2 }}>
            {title}
          </Typography>
        </Box>
        {subtitle && (
          <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic", mt: "2px", pl: "16px" }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      <Box sx={{ px: `${tokens.spacing.md}px`, overflowY: "auto", minHeight: 0 }}>{children}</Box>

      {actions && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: `${tokens.spacing.sm}px`,
            px: `${tokens.spacing.md}px`,
            py: `${tokens.spacing.sm}px`,
            flexShrink: 0,
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
};
