import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { MyGameProps, EventCardName, EVENT_CARD_DEFS } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";
import { tokens } from "@/theme";
import { EVENT_ICONS } from "./eventCardIcons";

const PickEventCardDialog = (props: MyGameProps) => {
  const [selectedCard, setSelectedCard] = useState<EventCardName | undefined>(undefined);
  const [open, setOpen] = useState(true);

  const playerID = props.playerID ?? props.ctx.currentPlayer;
  const hand = props.G.playerInfo[playerID]?.resources.eventCards ?? [];

  const isOpen =
    open &&
    props.G.stage === "events" &&
    props.ctx.currentPlayer === props.playerID;

  return (
    <DialogShell
      open={isOpen}
      title="Choose an Event Card"
      mood="crisis"
      size="sm"
      confirmLabel="Play Card"
      confirmDisabled={!selectedCard}
      onConfirm={() => {
        props.moves.chooseEventCard(selectedCard);
        setOpen(false);
      }}
    >
      <Typography
        sx={{
          fontFamily: tokens.font.body,
          fontSize: tokens.fontSize.xs,
          color: tokens.ui.textMuted,
          mb: 1.5,
          textAlign: "center",
        }}
      >
        Pick one card to play face-down. All chosen cards will be shuffled and
        one will be revealed.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {hand.map((card) => {
          const def = EVENT_CARD_DEFS[card];
          const Icon = EVENT_ICONS[card];
          const isSelected = selectedCard === card;

          return (
            <Box
              key={card}
              onClick={() => setSelectedCard(card)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: `${tokens.spacing.sm}px`,
                px: `${tokens.spacing.sm}px`,
                py: `${tokens.spacing.xs + 2}px`,
                borderRadius: `${tokens.radius.md}px`,
                border: `1.5px solid ${isSelected ? tokens.ui.gold : tokens.ui.border}`,
                background: isSelected
                  ? `linear-gradient(135deg, ${tokens.ui.surfaceHover} 0%, ${tokens.ui.surface} 100%)`
                  : `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
                cursor: "pointer",
                transition: `all ${tokens.transition.fast}`,
                position: "relative",
                overflow: "hidden",
                boxShadow: isSelected
                  ? `0 0 12px ${tokens.ui.gold}25, inset 0 1px 0 rgba(255,255,255,0.3)`
                  : `inset 0 1px 0 rgba(255,255,255,0.3)`,
                "&:hover": {
                  borderColor: `${tokens.ui.gold}66`,
                  backgroundColor: tokens.ui.surfaceHover,
                },
              }}
            >
              {/* Icon */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
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
                  <Icon
                    size={22}
                    color={def.isBattle ? tokens.ui.danger : tokens.ui.gold}
                    style={{ opacity: 0.8 }}
                  />
                )}
              </Box>

              {/* Text */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: tokens.font.display,
                    fontSize: tokens.fontSize.sm,
                    color: isSelected ? tokens.ui.gold : tokens.ui.text,
                    lineHeight: 1.2,
                  }}
                >
                  {def.displayName}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: 10,
                    color: tokens.ui.textMuted,
                    lineHeight: 1.3,
                    mt: "1px",
                  }}
                >
                  {def.description}
                </Typography>
              </Box>

              {/* Battle indicator */}
              {def.isBattle && (
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: 9,
                    fontWeight: 700,
                    color: tokens.ui.danger,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    flexShrink: 0,
                  }}
                >
                  ⚔ Battle
                </Typography>
              )}

              {/* Selected check */}
              {isSelected && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "0 20px 20px 0",
                    borderColor: `transparent ${tokens.ui.gold} transparent transparent`,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </DialogShell>
  );
};

export default PickEventCardDialog;
