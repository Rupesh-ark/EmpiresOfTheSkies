import { Box, Typography } from "@mui/material";
import { SxProps } from "@mui/material/styles";
import { tokens } from "@/theme";

export interface CardFrameProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  faceDown?: boolean;
  cardBackUrl?: string;
  width?: number;
  height?: number;
  mood?: "default" | "battle" | "election" | "discovery" | "crisis";
  sx?: SxProps;
}

// mood "default" has no distinct border — matches GamePanel's convention
const moodBorderMap: Record<string, string | undefined> = {
  battle:    tokens.mood.battle.border,
  election:  tokens.mood.election.border,
  discovery: tokens.mood.discovery.border,
  crisis:    tokens.mood.crisis.border,
};

export const CardFrame = ({
  title,
  description,
  imageUrl,
  imageFit = "contain",
  selected = false,
  onClick,
  disabled = false,
  faceDown = false,
  cardBackUrl,
  width = tokens.size.card.width,
  height = tokens.size.card.height,
  mood,
  sx,
}: CardFrameProps) => {
  const isClickable = !!onClick && !disabled;
  const moodBorder = mood ? moodBorderMap[mood] : undefined;

  const borderColor = selected
    ? tokens.ui.gold
    : moodBorder ?? tokens.ui.border;

  const boxShadow = selected
    ? tokens.shadow.glow(tokens.ui.gold)
    : "none";

  // What to render inside the card
  const renderContent = () => {
    if (faceDown) {
      if (cardBackUrl) {
        return (
          <img
            src={cardBackUrl}
            alt="card back"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        );
      }
      // Default card back — dark pattern with subtle grid
      return (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            background: `repeating-linear-gradient(
              45deg,
              ${tokens.ui.surface},
              ${tokens.ui.surface} 4px,
              ${tokens.ui.surfaceRaised} 4px,
              ${tokens.ui.surfaceRaised} 8px
            )`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            sx={{
              fontFamily: tokens.font.accent,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.borderMedium,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Empires
          </Typography>
        </Box>
      );
    }

    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={title ?? "card"}
          style={{ width: "100%", height: "100%", objectFit: imageFit, display: "block" }}
        />
      );
    }

    // Text-only fallback
    return (
      <Box
        sx={{
          p: `${tokens.spacing.sm}px`,
          display: "flex",
          flexDirection: "column",
          gap: `${tokens.spacing.xs}px`,
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {title && (
          <Typography
            sx={{
              fontFamily: tokens.font.accent,
              fontSize: tokens.fontSize.sm,
              color: tokens.ui.text,
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
        )}
        {description && (
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.textMuted,
              lineHeight: 1.4,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box
      onClick={isClickable ? onClick : undefined}
      sx={{
        position: "relative",
        width,
        height,
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: `${tokens.radius.card}px`,
        border: `1px solid ${borderColor}`,
        background: tokens.ui.surfaceRaised,
        boxShadow,
        opacity: disabled ? 0.5 : 1,
        cursor: isClickable ? "pointer" : "default",
        transition: `all ${tokens.transition.fast}`,
        ...(isClickable && !disabled && {
          "&:hover": {
            transform: "scale(1.03)",
          },
        }),
        ...sx,
      }}
    >
      {renderContent()}
    </Box>
  );
};
