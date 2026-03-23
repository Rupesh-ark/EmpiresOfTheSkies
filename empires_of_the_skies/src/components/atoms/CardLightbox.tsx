/**
 * CardLightbox — shared enlarged card dialog for player board views.
 *
 * Shows card image, title, description, and (for legacy cards) a coloured
 * accent bar + alignment scoring hint.
 */
import { Box, Dialog, Typography } from "@mui/material";
import { tokens } from "@/theme";

export type EnlargedCard = {
  src: string;
  title: string;
  description?: string;
  colour?: string;
};

export const CardLightbox = ({
  card,
  onClose,
}: {
  card: EnlargedCard | null;
  onClose: () => void;
}) => {
  if (!card) return null;

  const accentColour =
    card.colour === "purple" ? tokens.allegiance.orthodox
    : card.colour === "orange" ? tokens.allegiance.heresy
    : undefined;
  const colourLabel =
    card.colour === "purple" ? "Orthodox"
    : card.colour === "orange" ? "Heretic"
    : undefined;

  return (
    <Dialog
      open
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: "transparent",
          boxShadow: "none",
          overflow: "visible",
          maxWidth: "min(85vw, 520px)",
        },
      }}
      slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" } } }}
      onClick={onClose}
    >
      <Box
        sx={{
          position: "relative",
          borderRadius: `${tokens.radius.md}px`,
          overflow: "hidden",
          boxShadow: "0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        {accentColour && (
          <Box sx={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 5, backgroundColor: accentColour, zIndex: 2 }} />
        )}
        <Box
          component="img"
          src={card.src}
          alt={card.title}
          sx={{ width: "100%", display: "block" }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(15,10,5,0.95) 0%, rgba(15,10,5,0.8) 60%, transparent 100%)",
            px: 3,
            pt: 5,
            pb: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 0.5 }}>
            <Typography
              sx={{
                fontFamily: tokens.font.display,
                fontSize: tokens.fontSize.lg,
                color: "#F0D080",
                textAlign: "center",
                textTransform: "capitalize",
                lineHeight: 1.2,
                textShadow: "0 2px 4px rgba(0,0,0,0.8)",
              }}
            >
              {card.title}
            </Typography>
            {accentColour && (
              <Box sx={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: accentColour, border: "2px solid rgba(255,255,255,0.5)", flexShrink: 0 }} />
            )}
          </Box>
          {card.description && (
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.sm,
                color: "rgba(245,240,230,0.95)",
                textAlign: "center",
                lineHeight: 1.5,
                textShadow: "0 1px 2px rgba(0,0,0,0.7)",
              }}
            >
              {card.description}
            </Typography>
          )}
          {colourLabel && (
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.xs,
                color: accentColour,
                textAlign: "center",
                lineHeight: 1.4,
                mt: 1,
                fontWeight: 600,
                textShadow: "0 1px 2px rgba(0,0,0,0.7)",
              }}
            >
              {colourLabel} card — {colourLabel === "Orthodox" ? "full VP if Orthodox, half VP if Heretic" : "full VP if Heretic, half VP if Orthodox"}
            </Typography>
          )}
        </Box>
      </Box>
    </Dialog>
  );
};
