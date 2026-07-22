import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { MyGameProps, EventCardName, EVENT_CARD_DEFS, phaseGroup } from "@eots/game";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";
import { tokens } from "@/theme";
import { EVENT_ICONS } from "./eventCardIcons";

/**
 * Event card pick — a hand of cards fanned above the dock. The world
 * stays visible: you choose an event while seeing the board it will hit.
 */
const PickEventCardDialog = (props: MyGameProps) => {
  const [selectedCard, setSelectedCard] = useState<EventCardName | undefined>(undefined);
  const [open, setOpen] = useState(true);

  const playerID = props.playerID ?? props.ctx.currentPlayer;
  const hand = props.G.playerInfo[playerID]?.resources.eventCards ?? [];

  const isOpen =
    open &&
    phaseGroup(props.ctx.phase!) === "events" && props.G.step === "default" &&
    props.ctx.currentPlayer === props.playerID;

  return (
    <DecisionPanel
      open={isOpen}
      title="Choose an Event Card"
      subtitle="Pick one card to play face-down. All chosen cards will be shuffled and one will be revealed."
      mood="crisis"
      width={780}
      actions={
        <GameButton
          variant="primary"
          disabled={!selectedCard}
          onClick={() => {
            props.moves.chooseEventCard(selectedCard);
            setOpen(false);
          }}
        >
          Play Card
        </GameButton>
      }
    >
      <Box sx={{ display: "flex", gap: `${tokens.spacing.sm}px`, justifyContent: "center", alignItems: "stretch", py: "8px" }}>
        {hand.map((card) => {
          const def = EVENT_CARD_DEFS[card];
          const Icon = EVENT_ICONS[card];
          const isSelected = selectedCard === card;

          return (
            <Box
              key={card}
              onClick={() => setSelectedCard(card)}
              sx={{
                width: 228,
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                p: `${tokens.spacing.sm}px`,
                borderRadius: `${tokens.radius.md}px`,
                border: `1.5px solid ${isSelected ? tokens.ui.gold : tokens.ui.border}`,
                background: isSelected
                  ? `linear-gradient(135deg, ${tokens.ui.surfaceHover} 0%, ${tokens.ui.surface} 100%)`
                  : `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
                cursor: "pointer",
                transition: `all ${tokens.transition.fast}`,
                transform: isSelected ? "translateY(-6px)" : "none",
                boxShadow: isSelected
                  ? `0 8px 16px rgba(0,0,0,0.25), 0 0 12px ${tokens.ui.gold}33`
                  : "inset 0 1px 0 rgba(255,255,255,0.3)",
                "&:hover": {
                  borderColor: `${tokens.ui.gold}66`,
                  transform: isSelected ? "translateY(-6px)" : "translateY(-3px)",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: `${tokens.radius.sm}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: def.isBattle
                      ? `radial-gradient(circle, ${tokens.ui.danger}20 0%, transparent 70%)`
                      : `radial-gradient(circle, ${tokens.ui.gold}15 0%, transparent 70%)`,
                    border: `1px solid ${def.isBattle ? `${tokens.ui.danger}30` : `${tokens.ui.gold}20`}`,
                  }}
                >
                  {Icon && (
                    <Icon size={20} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.8 }} />
                  )}
                </Box>
                <Typography
                  sx={{
                    fontFamily: tokens.font.display,
                    fontSize: tokens.fontSize.sm,
                    color: isSelected ? tokens.ui.gold : tokens.ui.text,
                    lineHeight: 1.15,
                    flex: 1,
                  }}
                >
                  {def.displayName}
                </Typography>
                {def.isBattle && (
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, fontWeight: 700, color: tokens.ui.danger, flexShrink: 0 }}>
                    ⚔
                  </Typography>
                )}
              </Box>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, fontStyle: "italic", color: tokens.ui.textMuted, lineHeight: 1.3 }}>
                {def.description}
              </Typography>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: 12, color: tokens.ui.text, lineHeight: 1.4 }}>
                {def.effect}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </DecisionPanel>
  );
};

export default PickEventCardDialog;
