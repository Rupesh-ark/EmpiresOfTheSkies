import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { MyGameProps, KingdomAdvantageCard, KA_CARD_DEFS } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { KA_CARD_IMAGES } from "@/assets/kingdomAdvantage";
import { tokens } from "@/theme";

const PickKingdomAdvantageCardDialog = (props: MyGameProps) => {
  const [selectedCard, setSelectedCard] = useState<KingdomAdvantageCard | undefined>(undefined);

  const isOpen =
    props.ctx.phase === "kingdom_advantage" &&
    props.ctx.currentPlayer === props.playerID;

  const availableCards = props.G.cardDecks.kingdomAdvantagePool;

  return (
    <DialogShell
      open={isOpen}
      title="Pick a Kingdom Advantage Card"
      subtitle="This card gives you a permanent rule advantage for the entire game."
      mood="discovery"
      size="sm"
      confirmLabel="Choose Card"
      confirmDisabled={!selectedCard}
      onConfirm={() => {
        props.moves.pickKingdomAdvantageCard(selectedCard);
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {availableCards.map((card) => {
          const def = KA_CARD_DEFS[card];
          const isSelected = selectedCard === card;
          return (
            <Box
              key={card}
              onClick={() => setSelectedCard(card)}
              sx={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                p: "8px",
                borderRadius: `${tokens.radius.md}px`,
                border: `2px solid ${isSelected ? tokens.ui.gold : tokens.ui.border}`,
                background: isSelected
                  ? `linear-gradient(135deg, ${tokens.ui.surface}, ${tokens.ui.surfaceRaised})`
                  : tokens.ui.surfaceRaised,
                boxShadow: isSelected ? tokens.shadow.glow(tokens.ui.gold) : "none",
                cursor: "pointer",
                transition: `all ${tokens.transition.fast}`,
                "&:hover": {
                  borderColor: isSelected ? tokens.ui.gold : tokens.ui.borderMedium,
                  background: tokens.ui.surfaceHover,
                },
              }}
            >
              {/* Landscape card thumbnail */}
              <Box
                sx={{
                  width: 160,
                  height: 113,
                  flexShrink: 0,
                  borderRadius: `${tokens.radius.sm}px`,
                  overflow: "hidden",
                }}
              >
                <img
                  src={KA_CARD_IMAGES[card]}
                  alt={def.displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </Box>

              {/* Card info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: tokens.font.accent,
                    fontSize: 14,
                    color: isSelected ? tokens.ui.gold : tokens.ui.text,
                    lineHeight: 1.2,
                    mb: "4px",
                    transition: `color ${tokens.transition.fast}`,
                  }}
                >
                  {def.displayName}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: 12,
                    color: tokens.ui.textMuted,
                    lineHeight: 1.5,
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

export default PickKingdomAdvantageCardDialog;
