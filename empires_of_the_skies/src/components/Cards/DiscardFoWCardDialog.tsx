import { MyGameProps } from "@eots/game";
import { Typography, Box } from "@mui/material";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { tokens } from "@/theme";

const DiscardFoWCardDialog = (props: MyGameProps) => {
  if (props.G.stage.sub !== "discard_fow" || props.ctx.currentPlayer !== props.playerID || !props.playerID) return null;

  const hand = props.G.playerInfo[props.playerID].resources.fortuneCards;
  const maxCards = 4;

  return (
    <DecisionPanel
      open
      title="Discard Fortune of War Cards"
      subtitle={`Your hand exceeds ${maxCards} cards — click cards to discard (${hand.length} / ${maxCards})`}
      mood="battle"
      width={520}
    >
      <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", py: "6px", pb: "14px" }}>
        {hand.map((card, i) => {
          const isSword = card.sword > 0;
          const accent = isSword ? "#c62828" : card.shield > 0 ? "#1565c0" : tokens.ui.textMuted;
          return (
            <Box
              key={`${card.name}-${i}`}
              onClick={() => props.moves.discardFoWCard(i)}
              sx={{
                width: 88,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                py: `${tokens.spacing.sm}px`,
                borderRadius: `${tokens.radius.md}px`,
                border: `2px solid ${accent}66`,
                borderTop: `3px solid ${accent}`,
                background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
                cursor: "pointer",
                transition: `all ${tokens.transition.fast}`,
                "&:hover": {
                  borderColor: accent,
                  transform: "translateY(-3px)",
                  boxShadow: `0 4px 10px rgba(0,0,0,0.25), 0 0 8px ${accent}44`,
                },
              }}
            >
              <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.lg, fontWeight: 700, color: accent, lineHeight: 1 }}>
                {isSword ? card.sword : card.shield > 0 ? card.shield : "—"}
              </Typography>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, fontWeight: 600, color: tokens.ui.text, lineHeight: 1 }}>
                {isSword ? "⚔ Swords" : card.shield > 0 ? "🛡 Shields" : "No effect"}
              </Typography>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, color: tokens.ui.textMuted, fontStyle: "italic", lineHeight: 1 }}>
                discard
              </Typography>
            </Box>
          );
        })}
      </Box>
    </DecisionPanel>
  );
};

export default DiscardFoWCardDialog;
