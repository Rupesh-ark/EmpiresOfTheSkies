import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";

export const SectionHeader = ({ label }: { label: string }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: `${tokens.spacing.sm}px`,
      mb: `${tokens.spacing.sm}px`,
    }}
  >
    <Box
      sx={{
        height: "1px",
        width: 12,
        background: `linear-gradient(90deg, transparent, ${tokens.ui.gold})`,
        flexShrink: 0,
      }}
    />
    <Typography
      sx={{
        fontFamily: tokens.font.accent,
        fontSize: tokens.fontSize.xs,
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
