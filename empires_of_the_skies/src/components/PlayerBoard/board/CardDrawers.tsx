import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { PlayerFortuneOfWarCardInfo, LEGACY_CARD_DEFS, KA_CARD_DEFS, EVENT_CARD_DEFS } from "@eots/game";
import { EVENT_ICONS } from "@/components/Events/eventCardIcons";
import { SWORD_CARDS, SHIELD_CARDS, NO_EFFECT_CARD, FOW_CARD_BACK } from "@/assets/fortuneOfWarCards";
import { LEGACY_CARD_IMAGES } from "@/assets/legacyCards";
import { KA_CARD_IMAGES } from "@/assets/kingdomAdvantage";
import { CardFrame } from "@/components/atoms/CardFrame";
import { CardLightbox, type EnlargedCard } from "@/components/atoms/CardLightbox";
import { GamePanel } from "@/components/atoms/GamePanel";
import { SectionHeader } from "./SectionHeader";
import type { CardTab } from "./types";

const CARD_WIDTH = 100;
const CARD_HEIGHT = 180;

const getFoWCardImage = (card: PlayerFortuneOfWarCardInfo): string => {
  if (!card.flipped) return FOW_CARD_BACK;
  if (card.sword > 0) return SWORD_CARDS[card.sword] ?? NO_EFFECT_CARD;
  if (card.shield > 0) return SHIELD_CARDS[card.shield] ?? NO_EFFECT_CARD;
  return NO_EFFECT_CARD;
};

interface CardDrawersProps {
  fortuneCards: PlayerFortuneOfWarCardInfo[];
  legacyCard: { name: string; colour: string } | undefined;
  advantageCard: string | undefined;
  eventCards: import("@eots/game").EventCardName[];
  resolvedEvent: import("@eots/game").EventCardName | null;
  eventContributions: Record<string, import("@eots/game").EventCardName>;
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
}

export const CardDrawers = ({
  fortuneCards,
  legacyCard,
  advantageCard,
  eventCards,
  resolvedEvent,
  eventContributions,
  playerInfo,
}: CardDrawersProps) => {
  const [openTab, setOpenTab] = useState<CardTab | null>(null);
  const [enlargedCard, setEnlargedCard] = useState<EnlargedCard | null>(null);

  const toggleTab = (tab: CardTab) =>
    setOpenTab((prev) => (prev === tab ? null : tab));

  const fowCount = fortuneCards.length;
  const legacyCount = legacyCard ? 1 : 0;
  const kaCount = advantageCard ? 1 : 0;
  const eventCount = eventCards.length;

  return (
    <GamePanel variant="default" padding="sm">
      <SectionHeader label="Cards" />

      <Box
        sx={{
          display: "flex",
          gap: "2px",
          mb: openTab ? `${tokens.spacing.sm}px` : 0,
        }}
      >
        {([
          { key: "fow" as CardTab, label: "FoW", count: fowCount },
          { key: "legacy" as CardTab, label: "Legacy", count: legacyCount },
          { key: "ka" as CardTab, label: "KA", count: kaCount },
          { key: "events" as CardTab, label: "Events", count: eventCount },
        ]).map(({ key, label, count }) => (
          <Box
            key={key}
            onClick={() => count > 0 && toggleTab(key)}
            sx={{
              flex: 1,
              textAlign: "center",
              py: `${tokens.spacing.xs}px`,
              px: `${tokens.spacing.sm}px`,
              cursor: count > 0 ? "pointer" : "default",
              borderRadius: `${tokens.radius.sm}px`,
              backgroundColor: openTab === key ? tokens.ui.surfaceHover : "transparent",
              border: `1px solid ${openTab === key ? tokens.ui.borderMedium : tokens.ui.border}`,
              opacity: count === 0 ? 0.4 : 1,
              transition: `all ${tokens.transition.fast}`,
              "&:hover": count > 0 ? { backgroundColor: tokens.ui.surfaceHover } : {},
            }}
          >
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.xs,
                color: openTab === key ? tokens.ui.gold : tokens.ui.textMuted,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {label} ({count})
            </Typography>
          </Box>
        ))}
      </Box>

      {openTab === "fow" && (
        <Box sx={{ display: "flex", gap: `${tokens.spacing.sm}px`, flexWrap: "wrap", justifyContent: "center" }}>
          {fortuneCards.map((card, i) => {
            const img = getFoWCardImage(card);
            const fowTitle = card.sword > 0
              ? `${card.sword} Sword${card.sword > 1 ? "s" : ""}`
              : card.shield > 0
                ? `${card.shield} Shield${card.shield > 1 ? "s" : ""}`
                : "No Effect";
            const fowDesc = card.sword > 0
              ? `Adds ${card.sword} sword${card.sword > 1 ? "s" : ""} to your combat strength when played in battle.`
              : card.shield > 0
                ? `Absorbs ${card.shield} sword${card.shield > 1 ? "s" : ""} of enemy damage when played in battle.`
                : "This card has no combat effect when played.";
            return (
              <CardFrame
                key={i}
                title={card.flipped ? fowTitle : undefined}
                description={card.flipped ? `⚔ ${card.sword}  🛡 ${card.shield}` : undefined}
                imageUrl={img}
                faceDown={!card.flipped}
                cardBackUrl={FOW_CARD_BACK}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                onClick={card.flipped ? () => setEnlargedCard({ src: img, title: fowTitle, description: fowDesc }) : undefined}
              />
            );
          })}
        </Box>
      )}

      {openTab === "legacy" && (
        <>
          {legacyCard ? (() => {
            const img = LEGACY_CARD_IMAGES[legacyCard.name.toLowerCase()];
            const def = LEGACY_CARD_DEFS[legacyCard.name.toLowerCase() as keyof typeof LEGACY_CARD_DEFS];
            return (
              <Box
                onClick={() => setEnlargedCard({ src: img, title: legacyCard.name, description: def?.description, colour: legacyCard.colour })}
                sx={{
                  position: "relative",
                  borderRadius: `${tokens.radius.md}px`,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: `all ${tokens.transition.fast}`,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.15)`,
                  "&:hover": { boxShadow: `0 4px 16px rgba(0,0,0,0.25)`, transform: "scale(1.01)" },
                }}
              >
                <Box sx={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, backgroundColor: legacyCard.colour === "purple" ? tokens.allegiance.orthodox : tokens.allegiance.heresy, zIndex: 2 }} />
                <Box component="img" src={img} alt={legacyCard.name} sx={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(15,10,5,0.95) 0%, rgba(15,10,5,0.8) 60%, transparent 100%)", px: 2, pt: 4, pb: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.base, color: "#F0D080", lineHeight: 1.2, textTransform: "capitalize", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                      {legacyCard.name}
                    </Typography>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: legacyCard.colour === "purple" ? "#9b59b6" : "#e67e22", border: "1.5px solid rgba(255,255,255,0.5)", flexShrink: 0 }} />
                  </Box>
                  {def && (
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: "rgba(245,240,230,0.95)", lineHeight: 1.4, mt: "2px", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>
                      {def.description}
                    </Typography>
                  )}
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: legacyCard.colour === "purple" ? tokens.allegiance.orthodox : tokens.allegiance.heresy, lineHeight: 1.3, mt: "3px", fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>
                    {legacyCard.colour === "purple" ? "Orthodox — full VP if Orthodox, half if Heretic" : "Heretic — full VP if Heretic, half if Orthodox"}
                  </Typography>
                </Box>
              </Box>
            );
          })() : (
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.textMuted, py: `${tokens.spacing.md}px`, textAlign: "center" }}>
              No Legacy Card
            </Typography>
          )}
        </>
      )}

      {openTab === "ka" && (
        <>
          {advantageCard ? (() => {
            const img = KA_CARD_IMAGES[advantageCard];
            const def = KA_CARD_DEFS[advantageCard as keyof typeof KA_CARD_DEFS];
            const title = def?.displayName ?? advantageCard.replace(/_/g, " ");
            return (
              <Box
                onClick={() => setEnlargedCard({ src: img, title, description: def?.description })}
                sx={{
                  position: "relative",
                  borderRadius: `${tokens.radius.md}px`,
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: `all ${tokens.transition.fast}`,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.15)`,
                  "&:hover": { boxShadow: `0 4px 16px rgba(0,0,0,0.25)`, transform: "scale(1.01)" },
                }}
              >
                <Box component="img" src={img} alt={title} sx={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(15,10,5,0.88) 0%, rgba(15,10,5,0.6) 60%, transparent 100%)", px: 2, pt: 4, pb: 1.5 }}>
                  <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.base, color: tokens.ui.gold, lineHeight: 1.2, textTransform: "capitalize" }}>
                    {title}
                  </Typography>
                  {def && (
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: "rgba(235,225,210,0.85)", lineHeight: 1.4, mt: "2px" }}>
                      {def.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })() : (
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.sm, color: tokens.ui.textMuted, py: `${tokens.spacing.md}px`, textAlign: "center" }}>
              No Advantage Card
            </Typography>
          )}
        </>
      )}

      {openTab === "events" && (() => {
        const hasContributions = Object.keys(eventContributions).length > 0;
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {resolvedEvent && (() => {
              const def = EVENT_CARD_DEFS[resolvedEvent];
              const Icon = EVENT_ICONS[resolvedEvent];
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px`, px: `${tokens.spacing.sm}px`, py: `${tokens.spacing.xs + 2}px`, borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.ui.gold}55`, background: `linear-gradient(135deg, ${tokens.ui.gold}12 0%, transparent 100%)` }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: `radial-gradient(circle, ${tokens.ui.gold}25 0%, transparent 70%)` }}>
                    {Icon && <Icon size={18} color={tokens.ui.gold} style={{ opacity: 0.9 }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: tokens.ui.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1 }}>
                      Resolved
                    </Typography>
                    <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.sm, color: tokens.ui.gold, lineHeight: 1.2 }}>
                      {def.displayName}
                    </Typography>
                    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1.3, mt: "1px" }}>
                      {def.description}
                    </Typography>
                  </Box>
                </Box>
              );
            })()}

            {hasContributions && (
              <>
                <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", mt: "2px" }}>
                  Chosen Cards
                </Typography>
                {Object.entries(eventContributions).map(([pid, card]) => {
                  const def = EVENT_CARD_DEFS[card];
                  const Icon = EVENT_ICONS[card];
                  const player = playerInfo[pid];
                  const isResolved = card === resolvedEvent;
                  return (
                    <Box key={pid} sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.sm}px`, py: "4px", borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${isResolved ? `${tokens.ui.gold}44` : tokens.ui.border}`, backgroundColor: isResolved ? `${tokens.ui.gold}08` : tokens.ui.surface }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: player?.colour, flexShrink: 0, boxShadow: `0 0 4px ${player?.colour}66` }} />
                      <Box sx={{ width: 24, height: 24, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {Icon && <Icon size={14} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.7 }} />}
                      </Box>
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.text, lineHeight: 1.2, flex: 1 }}>
                        {def.displayName}
                      </Typography>
                      {isResolved && (
                        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, fontWeight: 700, color: tokens.ui.gold, flexShrink: 0 }}>
                          ★
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </>
            )}

            {eventCards.length > 0 && (
              <>
                <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", mt: "2px" }}>
                  Your Hand
                </Typography>
                {eventCards.map((card, i) => {
                  const def = EVENT_CARD_DEFS[card];
                  const Icon = EVENT_ICONS[card];
                  return (
                    <Box key={`${card}-${i}`} sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.sm}px`, py: "4px", borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.ui.border}`, backgroundColor: tokens.ui.surface }}>
                      <Box sx={{ width: 24, height: 24, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {Icon && <Icon size={14} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.7 }} />}
                      </Box>
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1.2 }}>
                        {def.displayName}
                      </Typography>
                    </Box>
                  );
                })}
              </>
            )}
          </Box>
        );
      })()}

      <CardLightbox card={enlargedCard} onClose={() => setEnlargedCard(null)} />
    </GamePanel>
  );
};
