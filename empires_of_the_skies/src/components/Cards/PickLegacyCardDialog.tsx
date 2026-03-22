import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { MyGameProps, LegacyCardInfo, LEGACY_CARD_DEFS } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { LEGACY_CARD_IMAGES } from "@/assets/legacyCards";
import { tokens } from "@/theme";

const COLOUR_ACCENT: Record<string, string> = {
  purple: tokens.allegiance.orthodox,
  orange: tokens.allegiance.heresy,
};

const COLOUR_LABEL: Record<string, string> = {
  purple: "Orthodox",
  orange: "Heretic",
};

const PickLegacyCardDialog = (props: MyGameProps) => {
  const [currentCard, setCurrentCard] = useState<LegacyCardInfo | undefined>(undefined);

  const isOpen =
    props.ctx.phase === "legacy_card" &&
    props.ctx.currentPlayer === props.playerID;

  const legacyOptions =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]?.legacyCardOptions ?? [];

  return (
    <DialogShell
      open={isOpen}
      title="Pick a Legacy Card"
      subtitle="Scored at end of game. If your alignment (Orthodox/Heretic) doesn't match the card's colour, VP earned from this card is halved."
      mood="discovery"
      size="md"
      confirmLabel="Use selected card"
      confirmDisabled={!currentCard}
      onConfirm={() => {
        props.moves.pickLegacyCard(currentCard);
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          justifyContent: "center",
          py: 1,
        }}
      >
        {legacyOptions.map((card) => {
          if (!card) return null;
          const def = LEGACY_CARD_DEFS[card.name];
          const isSelected =
            currentCard?.name === card.name && currentCard?.colour === card.colour;
          const colourAccent = COLOUR_ACCENT[card.colour] ?? tokens.ui.textMuted;
          const colourLabel = COLOUR_LABEL[card.colour] ?? card.colour;

          return (
            <Box
              key={`${card.name}-${card.colour}`}
              onClick={() => setCurrentCard(card)}
              sx={{
                width: 200,
                borderRadius: `${tokens.radius.md}px`,
                border: `2px solid ${isSelected ? tokens.ui.gold : tokens.ui.border}`,
                background: isSelected
                  ? `linear-gradient(135deg, ${tokens.ui.surface}, ${tokens.ui.surfaceRaised})`
                  : tokens.ui.surfaceRaised,
                boxShadow: isSelected ? tokens.shadow.glow(tokens.ui.gold) : "none",
                cursor: "pointer",
                transition: `all ${tokens.transition.fast}`,
                overflow: "hidden",
                position: "relative",
                "&:hover": {
                  borderColor: isSelected ? tokens.ui.gold : tokens.ui.borderMedium,
                  background: tokens.ui.surfaceHover,
                  transform: "translateY(-2px)",
                },
              }}
            >
              {/* Coloured accent bar — full-height left edge */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 4,
                  backgroundColor: colourAccent,
                  zIndex: 1,
                }}
              />

              {/* Portrait card image */}
              <Box sx={{ width: "100%", aspectRatio: "768 / 1088", overflow: "hidden" }}>
                <img
                  src={LEGACY_CARD_IMAGES[card.name]}
                  alt={def.displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </Box>

              {/* Card info below image */}
              <Box sx={{ p: "10px 12px 12px 14px" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mb: "4px" }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: colourAccent,
                      flexShrink: 0,
                      border: `1.5px solid ${colourAccent}`,
                      boxShadow: `0 0 4px ${colourAccent}60`,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: tokens.font.accent,
                      fontSize: 14,
                      color: isSelected ? tokens.ui.gold : tokens.ui.text,
                      lineHeight: 1.2,
                      transition: `color ${tokens.transition.fast}`,
                    }}
                  >
                    {def.displayName}
                  </Typography>
                </Box>

                {/* Alignment label */}
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: 10,
                    fontWeight: 700,
                    color: colourAccent,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    mb: "6px",
                  }}
                >
                  {colourLabel}
                </Typography>

                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: 12,
                    color: tokens.ui.textMuted,
                    lineHeight: 1.4,
                  }}
                >
                  {def.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </DialogShell>
  );
};

export default PickLegacyCardDialog;
