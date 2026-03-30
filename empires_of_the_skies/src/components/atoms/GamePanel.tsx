import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { tokens } from "@/theme";

export interface GamePanelProps {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  mood?: "default" | "battle" | "election" | "discovery" | "crisis";
  variant?: "default" | "raised" | "flat";
  padding?: "none" | "sm" | "md" | "lg";
  sx?: SxProps;
}

const paddingMap = {
  none: 0,
  sm:   `${tokens.spacing.sm}px`,
  md:   `${tokens.spacing.md}px`,
  lg:   `${tokens.spacing.lg}px`,
};

const variantStyleMap = {
  default: {
    background:  tokens.ui.surface,
    border:      `1px solid ${tokens.ui.border}`,
    boxShadow:   "none",
  },
  raised: {
    background:  tokens.ui.surfaceRaised,
    border:      `1px solid ${tokens.ui.border}`,
    boxShadow:   tokens.shadow.md,
  },
  flat: {
    background:  "transparent",
    border:      "none",
    boxShadow:   "none",
  },
};

// mood "default" has no accent border — only the named phase moods do
const moodBorderMap: Record<string, string | undefined> = {
  battle:    tokens.mood.battle.border,
  election:  tokens.mood.election.border,
  discovery: tokens.mood.discovery.border,
  crisis:    tokens.mood.crisis.border,
};

export const GamePanel = ({
  title,
  subtitle,
  headerRight,
  children,
  mood,
  variant = "default",
  padding = "md",
  sx,
}: GamePanelProps) => {
  const variantStyles = variantStyleMap[variant];
  const moodBorder = mood ? moodBorderMap[mood] : undefined;
  const pad = paddingMap[padding];

  return (
    <Box
      sx={{
        borderRadius: `${tokens.radius.lg}px`,
        ...variantStyles,
        ...(moodBorder && { borderLeft: `4px solid ${moodBorder}` }),
        overflow: "hidden",
        ...sx,
      }}
    >
      {(title || subtitle || headerRight) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: `${tokens.spacing.sm}px`,
            px: pad,
            pt: pad,
            pb: subtitle ? `${tokens.spacing.xs}px` : pad,
          }}
        >
          <Box>
            {title && (
              <Typography
                sx={{
                  fontFamily: tokens.font.display,
                  fontSize: tokens.fontSize.lg,
                  color: tokens.ui.text,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                sx={{
                  fontFamily: tokens.font.body,
                  fontSize: tokens.fontSize.sm,
                  color: tokens.ui.textMuted,
                  lineHeight: 1.4,
                  mt: 0.25,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {headerRight && (
            <Box sx={{ flexShrink: 0 }}>{headerRight}</Box>
          )}
        </Box>
      )}
      <Box sx={{ px: pad, pb: pad, pt: title || subtitle ? 0 : pad }}>
        {children}
      </Box>
    </Box>
  );
};
