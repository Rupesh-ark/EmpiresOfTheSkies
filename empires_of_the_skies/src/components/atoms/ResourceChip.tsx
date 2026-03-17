import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { tokens } from "@/theme";

export interface ResourceChipProps {
  icon: ReactNode;
  value: number | string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "positive" | "negative" | "muted";
  sx?: SxProps;
}

const sizeMap = {
  sm: { height: 24, fontSize: tokens.fontSize.xs, px: `${tokens.spacing.xs}px`, gap: `${tokens.spacing.xs / 2}px` },
  md: { height: 32, fontSize: tokens.fontSize.sm, px: `${tokens.spacing.sm}px`, gap: `${tokens.spacing.xs}px` },
  lg: { height: 40, fontSize: tokens.fontSize.md, px: `${tokens.spacing.sm}px`, gap: `${tokens.spacing.sm / 2}px` },
};

const variantColorMap = {
  default:  tokens.ui.text,
  positive: tokens.ui.success,
  negative: tokens.ui.danger,
  muted:    tokens.ui.textMuted,
};

export const ResourceChip = ({
  icon,
  value,
  label,
  size = "md",
  variant = "default",
  sx,
}: ResourceChipProps) => {
  const { height, fontSize, px, gap } = sizeMap[size];
  const color = variantColorMap[variant];

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        height,
        px,
        gap,
        background: tokens.ui.surfaceHover,
        border: `1px solid ${tokens.ui.border}`,
        borderRadius: `${tokens.radius.pill}px`,
        color,
        "& svg, & *[data-icon]": { color, fontSize: height * 0.55 },
        ...sx,
      }}
    >
      {icon}
      <Typography
        component="span"
        sx={{ fontSize, fontFamily: tokens.font.body, lineHeight: 1, color }}
      >
        {value}
      </Typography>
      {label && (
        <Typography
          component="span"
          sx={{
            fontSize,
            fontFamily: tokens.font.body,
            lineHeight: 1,
            color: tokens.ui.textMuted,
          }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
};
