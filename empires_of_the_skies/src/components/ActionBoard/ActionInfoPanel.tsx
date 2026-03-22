/**
 * ActionInfoPanel — shown in the right tab panel when hovering action buttons.
 * Displays the action's title, cost, and full description, centered.
 */
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { useActionHover, ACTION_INFO } from "./ActionHoverContext";

export const ActionInfoPanel = () => {
  const { hoveredAction } = useActionHover();
  const info = hoveredAction ? ACTION_INFO[hoveredAction] : null;

  if (!info) {
    return (
      <Box sx={{ p: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Typography
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.fontSize.md,
            color: tokens.ui.textMuted,
            mb: 1,
          }}
        >
          Action Info
        </Typography>
        <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.textMuted, fontStyle: "italic" }}>
          Hover over any button to see its details.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <Typography
        sx={{
          fontFamily: tokens.font.display,
          fontSize: tokens.fontSize.md,
          color: tokens.ui.text,
          lineHeight: 1.3,
          mb: 0.5,
        }}
      >
        {info.title}
      </Typography>

      {info.cost && (
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.sm,
            color: tokens.ui.gold,
            fontWeight: 600,
            mb: 1,
          }}
        >
          Cost: {info.cost}
        </Typography>
      )}

      <Typography
        sx={{
          fontFamily: tokens.font.body,
          fontSize: tokens.fontSize.sm,
          color: tokens.ui.text,
          lineHeight: 1.5,
          maxWidth: 280,
          whiteSpace: "pre-line",
        }}
      >
        {info.description}
      </Typography>
    </Box>
  );
};
