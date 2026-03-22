/**
 * PlayerBoardCompact — Kingdom Dashboard card.
 *
 * Used in all visible non-actions phases (events, discovery, battles,
 * election, resolution). Styled like a physical board game reference card
 * with sectioned layout: Treasury, Forces, Fleets, Cards.
 *
 * Read-only. No interactions.
 */
import { useState } from "react";
import { Box, Dialog, Typography } from "@mui/material";
import { IconCounsellor, IconGold, IconVP, IconRegiment, IconElite, IconLevy, IconSkyship } from "@/theme";
import { tokens } from "@/theme";
import { MyGameProps } from "@eots/game";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import { GamePanel } from "@/components/atoms/GamePanel";
import { CardFrame } from "@/components/atoms/CardFrame";
import { getLocationPresentation } from "@/utils/locationLabels";
import {
  SWORD_CARDS,
  SHIELD_CARDS,
  NO_EFFECT_CARD,
  FOW_CARD_BACK,
} from "@/assets/fortuneOfWarCards";
import { LEGACY_CARD_IMAGES } from "@/assets/legacyCards";
import { KA_CARD_IMAGES } from "@/assets/kingdomAdvantage";
import type { PlayerFortuneOfWarCardInfo } from "@eots/game";
import { LEGACY_CARD_DEFS, KA_CARD_DEFS, EVENT_CARD_DEFS } from "@eots/game";
import { EVENT_ICONS } from "@/components/Events/eventCardIcons";
import { Holdings } from "./Holdings";
import popeLogo from "@/boards_and_assets/action_board/pope_logo.png";
import captainGeneralLogo from "@/boards_and_assets/action_board/captain_general.png";

interface PlayerBoardCompactProps extends MyGameProps {
  onOpenFleetLocation?: (location: number[]) => void;
  showHeresy?: boolean;
}

const getFoWCardImage = (card: PlayerFortuneOfWarCardInfo): string => {
  if (!card.flipped) return FOW_CARD_BACK;
  if (card.sword > 0) return SWORD_CARDS[card.sword] ?? NO_EFFECT_CARD;
  if (card.shield > 0) return SHIELD_CARDS[card.shield] ?? NO_EFFECT_CARD;
  return NO_EFFECT_CARD;
};

// ── Section header — brass ruled line with small-caps label ─────────────

const CompactSectionHeader = ({ label }: { label: string }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: `${tokens.spacing.xs}px`,
      mt: `${tokens.spacing.xs}px`,
      mb: `${tokens.spacing.xs}px`,
    }}
  >
    <Box
      sx={{
        height: "1px",
        width: 8,
        background: `linear-gradient(90deg, transparent, ${tokens.ui.gold})`,
        flexShrink: 0,
      }}
    />
    <Typography
      sx={{
        fontFamily: tokens.font.accent,
        fontSize: 10,
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

// ── Main component ──────────────────────────────────────────────────────

type CardTab = "fow" | "legacy" | "ka" | "events";

export const PlayerBoardCompact = (props: PlayerBoardCompactProps) => {
  const [openCardTab, setOpenCardTab] = useState<CardTab | null>(null);
  const [enlargedCard, setEnlargedCard] = useState<{ src: string; title: string; description?: string } | null>(null);
  const playerInfo = props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const colour = playerInfo.colour;
  const { regiments, eliteRegiments, levies, skyships, fortuneCards } = playerInfo.resources;
  const gold = playerInfo.resources.gold;
  const vp = playerInfo.resources.victoryPoints;
  const counsellors = playerInfo.resources.counsellors;

  const isHeretic = playerInfo.hereticOrOrthodox === "heretic";
  const heresyVP = isHeretic ? playerInfo.heresyTracker : -playerInfo.heresyTracker;
  const vpSign = heresyVP > 0 ? "+" : "";
  const alColor = isHeretic ? tokens.allegiance.heresy : tokens.allegiance.orthodox;
  const alLabel = isHeretic ? "Heretic" : "Orthodox";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        p: `${tokens.spacing.sm}px`,
        borderTop: `3px solid ${colour}`,
        height: "100%",
        overflowY: "auto",
      }}
    >
      {/* ── Kingdom Name + Titles ──────────────────────────────── */}
      <Box sx={{ mb: `${tokens.spacing.xs}px` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: colour,
              boxShadow: `0 0 6px ${colour}`,
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.fontSize.lg,
              color: colour,
              lineHeight: 1.2,
              textShadow: `0 0 12px ${colour}44`,
            }}
          >
            {playerInfo.kingdomName}
          </Typography>
          {(playerInfo.isArchprelate || playerInfo.isCaptainGeneral) && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px", ml: "auto" }}>
              {playerInfo.isArchprelate && (
                <Box
                  component="img"
                  src={popeLogo}
                  alt="Archprelate"
                  sx={{
                    width: 48,
                    height: 48,
                    objectFit: "contain",
                    filter: "sepia(0.6) saturate(1.5) hue-rotate(260deg) brightness(0.9)",
                    opacity: 0.75,
                  }}
                />
              )}
              {playerInfo.isCaptainGeneral && (
                <Box
                  component="img"
                  src={captainGeneralLogo}
                  alt="Captain-General"
                  sx={{
                    width: 48,
                    height: 48,
                    objectFit: "contain",
                    filter: "sepia(0.6) saturate(1.5) hue-rotate(90deg) brightness(0.9)",
                    opacity: 0.75,
                  }}
                />
              )}
            </Box>
          )}
        </Box>
        {(playerInfo.isArchprelate || playerInfo.isCaptainGeneral) && (
          <Typography
            sx={{
              fontFamily: tokens.font.accent,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.gold,
              fontStyle: "italic",
              lineHeight: 1.2,
              pl: `${tokens.spacing.sm + 10}px`,
            }}
          >
            {[
              playerInfo.isArchprelate && "Seat of the Archprelate",
              playerInfo.isCaptainGeneral && "Captain-General of the Faith",
            ].filter(Boolean).join(" · ")}
          </Typography>
        )}
      </Box>

      {/* ── Treasury ─────────────────────────────────────────────── */}
      <GamePanel variant="default" padding="sm">
        <CompactSectionHeader label="Treasury" />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.xs}px` }}>
          <ResourceChip
            icon={<IconCounsellor style={{ fontSize: 14, color: tokens.ui.gold }} />}
            value={counsellors}
            size="sm"
            variant={counsellors === 0 ? "muted" : "default"}
          />
          <ResourceChip
            icon={<IconGold style={{ fontSize: 14, color: gold < 0 ? tokens.ui.danger : tokens.ui.gold }} />}
            value={gold}
            size="sm"
            variant={gold < 0 ? "negative" : "default"}
          />
          <ResourceChip
            icon={<IconVP style={{ fontSize: 14, color: tokens.ui.gold }} />}
            value={vp}
            size="sm"
          />
          {/* Allegiance chip */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              px: `${tokens.spacing.xs}px`,
              height: 24,
              borderRadius: `${tokens.radius.pill}px`,
              background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
              border: `1px solid ${alColor}33`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(80,60,30,0.10)`,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: alColor,
                boxShadow: `0 0 3px ${alColor}88`,
                flexShrink: 0,
              }}
            />
            <Typography
              component="span"
              sx={{
                fontSize: tokens.fontSize.xs,
                fontFamily: tokens.font.body,
                fontWeight: 600,
                color: alColor,
                lineHeight: 1,
              }}
            >
              {alLabel}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: tokens.fontSize.xs,
                fontFamily: tokens.font.body,
                fontWeight: 700,
                color: heresyVP >= 0 ? tokens.ui.success : tokens.ui.danger,
                lineHeight: 1,
              }}
            >
              {vpSign}{heresyVP}
            </Typography>
          </Box>
        </Box>

        {/* Heresy detail (election only) */}
        {props.showHeresy && (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: `${tokens.spacing.xs}px`,
              mt: `${tokens.spacing.xs}px`,
              px: `${tokens.spacing.sm}px`,
              py: `${tokens.spacing.xs}px`,
              borderRadius: `${tokens.radius.sm}px`,
              backgroundColor: `${alColor}15`,
              border: `1px solid ${alColor}33`,
            }}
          >
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.xs,
                color: alColor,
                fontWeight: 600,
              }}
            >
              {isHeretic ? "Heretic" : "Orthodox"}
              {" · "}Track: {playerInfo.heresyTracker}
            </Typography>
          </Box>
        )}
      </GamePanel>

      {/* ── Forces ───────────────────────────────────────────────── */}
      <GamePanel variant="default" padding="sm">
        <CompactSectionHeader label="Forces" />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.xs}px` }}>
          {[
            { Icon: IconRegiment, value: regiments, label: "Reg" },
            { Icon: IconElite, value: eliteRegiments ?? 0, label: "Elite" },
            { Icon: IconLevy, value: levies, label: "Lev" },
            { Icon: IconSkyship, value: skyships, label: "Sky" },
          ].map((f) => (
            <ResourceChip
              key={f.label}
              icon={<f.Icon style={{ fontSize: 14 }} />}
              value={f.value}
              label={f.label}
              size="sm"
              variant={f.value === 0 ? "muted" : "default"}
            />
          ))}
        </Box>
      </GamePanel>

      {/* ── Fleets ───────────────────────────────────────────────── */}
      <GamePanel variant="default" padding="sm">
        <CompactSectionHeader label="Fleets" />
        <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {playerInfo.fleetInfo.map((fleet, i) => {
            const loc = getLocationPresentation(
              props.G.mapState.currentTileArray,
              fleet.location
            );
            return (
              <Box
                key={fleet.fleetId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: `${tokens.spacing.sm}px`,
                  px: `${tokens.spacing.xs}px`,
                  py: "2px",
                  borderRadius: `${tokens.radius.sm}px`,
                  "&:hover": { backgroundColor: tokens.ui.surfaceHover },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.xs,
                    color: tokens.ui.text,
                    flex: 1,
                    lineHeight: 1.5,
                  }}
                >
                  Fleet {i + 1}
                  <Box component="span" sx={{ color: tokens.ui.textMuted, ml: 0.5 }}>
                    — {loc.name} [{loc.reference}]
                  </Box>
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                    fontSize: tokens.fontSize.xs,
                    color: tokens.ui.textMuted,
                    flexShrink: 0,
                  }}
                >
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>{fleet.skyships}<IconSkyship style={{ fontSize: 12 }} /></Box>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>{fleet.regiments}<IconRegiment style={{ fontSize: 12 }} /></Box>
                  {fleet.eliteRegiments > 0 && <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>{fleet.eliteRegiments}<IconElite style={{ fontSize: 12 }} /></Box>}
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "1px" }}>{fleet.levies}<IconLevy style={{ fontSize: 12 }} /></Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </GamePanel>

      {/* ── Cards ────────────────────────────────────────────────── */}
      <GamePanel variant="default" padding="sm">
        <CompactSectionHeader label="Cards" />

        {/* Tab buttons */}
        <Box sx={{ display: "flex", gap: "2px", mb: openCardTab ? `${tokens.spacing.xs}px` : 0 }}>
          {([
            { key: "fow" as CardTab, label: "FoW", count: fortuneCards.length },
            { key: "legacy" as CardTab, label: "Legacy", count: playerInfo.resources.legacyCard ? 1 : 0 },
            { key: "ka" as CardTab, label: "KA", count: playerInfo.resources.advantageCard ? 1 : 0 },
            { key: "events" as CardTab, label: "Events", count: playerInfo.resources.eventCards.length },
          ]).map(({ key, label, count }) => (
            <Box
              key={key}
              onClick={() => count > 0 && setOpenCardTab(prev => prev === key ? null : key)}
              sx={{
                flex: 1,
                textAlign: "center",
                py: `${tokens.spacing.xs}px`,
                cursor: count > 0 ? "pointer" : "default",
                borderRadius: `${tokens.radius.sm}px`,
                backgroundColor: openCardTab === key ? tokens.ui.surfaceHover : "transparent",
                border: `1px solid ${openCardTab === key ? tokens.ui.borderMedium : tokens.ui.border}`,
                opacity: count === 0 ? 0.4 : 1,
                transition: `all ${tokens.transition.fast}`,
                "&:hover": count > 0 ? { backgroundColor: tokens.ui.surfaceHover } : {},
              }}
            >
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: openCardTab === key ? tokens.ui.gold : tokens.ui.textMuted, fontWeight: 600, lineHeight: 1 }}>
                {label} ({count})
              </Typography>
            </Box>
          ))}
        </Box>

        {/* FoW drawer */}
        {openCardTab === "fow" && (
          <Box sx={{ display: "flex", gap: `${tokens.spacing.xs}px`, flexWrap: "wrap", justifyContent: "center" }}>
            {fortuneCards.map((card, i) => {
              const img = getFoWCardImage(card);
              return (
                <CardFrame
                  key={i}
                  title={card.flipped ? card.name : undefined}
                  description={card.flipped ? `⚔ ${card.sword}  🛡 ${card.shield}` : undefined}
                  imageUrl={img}
                  faceDown={!card.flipped}
                  cardBackUrl={FOW_CARD_BACK}
                  width={70}
                  height={120}
                  onClick={card.flipped ? () => setEnlargedCard({ src: img, title: card.name }) : undefined}
                />
              );
            })}
            {fortuneCards.length === 0 && (
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic" }}>
                No FoW cards
              </Typography>
            )}
          </Box>
        )}

        {/* Legacy drawer */}
        {openCardTab === "legacy" && (
          <>
            {playerInfo.resources.legacyCard ? (() => {
              const name = playerInfo.resources.legacyCard!.name;
              const img = LEGACY_CARD_IMAGES[name.toLowerCase()];
              const def = LEGACY_CARD_DEFS[name.toLowerCase() as keyof typeof LEGACY_CARD_DEFS];
              return (
                <Box
                  onClick={() => setEnlargedCard({ src: img, title: name, description: def?.description })}
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
                  <Box component="img" src={img} alt={name} sx={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                  <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(15,10,5,0.88) 0%, rgba(15,10,5,0.6) 60%, transparent 100%)", px: 1.5, pt: 3, pb: 1 }}>
                    <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.sm, color: tokens.ui.gold, lineHeight: 1.2, textTransform: "capitalize" }}>
                      {name}
                    </Typography>
                    {def && (
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: "rgba(235,225,210,0.85)", lineHeight: 1.3, mt: "1px" }}>
                        {def.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })() : (
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic" }}>
                No Legacy Card
              </Typography>
            )}
          </>
        )}

        {/* KA drawer */}
        {openCardTab === "ka" && (
          <>
            {playerInfo.resources.advantageCard ? (() => {
              const key = playerInfo.resources.advantageCard!;
              const img = KA_CARD_IMAGES[key];
              const def = KA_CARD_DEFS[key as keyof typeof KA_CARD_DEFS];
              const title = def?.displayName ?? key.replace(/_/g, " ");
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
                  <Box component="img" src={img} alt={title} sx={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                  <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(15,10,5,0.88) 0%, rgba(15,10,5,0.6) 60%, transparent 100%)", px: 1.5, pt: 3, pb: 1 }}>
                    <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.sm, color: tokens.ui.gold, lineHeight: 1.2, textTransform: "capitalize" }}>
                      {title}
                    </Typography>
                    {def && (
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: 9, color: "rgba(235,225,210,0.85)", lineHeight: 1.3, mt: "1px" }}>
                        {def.description}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })() : (
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic" }}>
                No Advantage Card
              </Typography>
            )}
          </>
        )}

        {/* Events drawer */}
        {openCardTab === "events" && (() => {
          const contributions = props.G.eventState.eventContributions;
          const resolved = props.G.eventState.resolvedEvent;
          const hasContributions = Object.keys(contributions).length > 0;

          return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {/* Resolved event */}
              {resolved && (() => {
                const def = EVENT_CARD_DEFS[resolved];
                const Icon = EVENT_ICONS[resolved];
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.xs}px`, py: `${tokens.spacing.xs + 1}px`, borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.ui.gold}55`, background: `linear-gradient(135deg, ${tokens.ui.gold}12 0%, transparent 100%)` }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: `radial-gradient(circle, ${tokens.ui.gold}25 0%, transparent 70%)` }}>
                      {Icon && <Icon size={16} color={tokens.ui.gold} style={{ opacity: 0.9 }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontFamily: tokens.font.body, fontSize: 8, color: tokens.ui.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1 }}>
                        Resolved
                      </Typography>
                      <Typography sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, color: tokens.ui.gold, lineHeight: 1.2 }}>
                        {def.displayName}
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}

              {/* Who chose what */}
              {hasContributions && (
                <>
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: 8, color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", mt: "2px" }}>
                    Chosen Cards
                  </Typography>
                  {Object.entries(contributions).map(([pid, card]) => {
                    const def = EVENT_CARD_DEFS[card];
                    const Icon = EVENT_ICONS[card];
                    const player = props.G.playerInfo[pid];
                    const isResolved = card === resolved;
                    return (
                      <Box
                        key={pid}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: `${tokens.spacing.xs}px`,
                          px: `${tokens.spacing.xs}px`,
                          py: "3px",
                          borderRadius: `${tokens.radius.sm}px`,
                          border: `1px solid ${isResolved ? `${tokens.ui.gold}44` : tokens.ui.border}`,
                          backgroundColor: isResolved ? `${tokens.ui.gold}08` : tokens.ui.surface,
                        }}
                      >
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: player?.colour, flexShrink: 0, boxShadow: `0 0 4px ${player?.colour}66` }} />
                        <Box sx={{ width: 22, height: 22, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {Icon && <Icon size={13} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.7 }} />}
                        </Box>
                        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 10, color: tokens.ui.text, lineHeight: 1.2, flex: 1 }}>
                          {def.displayName}
                        </Typography>
                        {isResolved && (
                          <Typography sx={{ fontFamily: tokens.font.body, fontSize: 7, fontWeight: 700, color: tokens.ui.gold, textTransform: "uppercase", flexShrink: 0 }}>
                            ★
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </>
              )}

              {/* Hand */}
              {playerInfo.resources.eventCards.length > 0 && (
                <>
                  <Typography sx={{ fontFamily: tokens.font.body, fontSize: 8, color: tokens.ui.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", mt: "2px" }}>
                    Your Hand
                  </Typography>
                  {playerInfo.resources.eventCards.map((card, i) => {
                    const def = EVENT_CARD_DEFS[card];
                    const Icon = EVENT_ICONS[card];
                    return (
                      <Box key={`${card}-${i}`} sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.xs}px`, px: `${tokens.spacing.xs}px`, py: "3px", borderRadius: `${tokens.radius.sm}px`, border: `1px solid ${tokens.ui.border}`, backgroundColor: tokens.ui.surface }}>
                        <Box sx={{ width: 22, height: 22, borderRadius: `${tokens.radius.sm}px`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {Icon && <Icon size={13} color={def.isBattle ? tokens.ui.danger : tokens.ui.gold} style={{ opacity: 0.7 }} />}
                        </Box>
                        <Typography sx={{ fontFamily: tokens.font.body, fontSize: 10, color: tokens.ui.textMuted, lineHeight: 1.2 }}>
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
      </GamePanel>

      {/* ── Card Lightbox ──────────────────────────────────────── */}
      <Dialog
        open={!!enlargedCard}
        onClose={() => setEnlargedCard(null)}
        PaperProps={{
          sx: {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "visible",
            maxWidth: "min(85vw, 520px)",
          },
        }}
        slotProps={{ backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" } } }}
        onClick={() => setEnlargedCard(null)}
      >
        {enlargedCard && (
          <Box
            sx={{
              position: "relative",
              borderRadius: `${tokens.radius.md}px`,
              overflow: "hidden",
              boxShadow: "0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <Box
              component="img"
              src={enlargedCard.src}
              alt={enlargedCard.title}
              sx={{
                width: "100%",
                display: "block",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "linear-gradient(to top, rgba(15,10,5,0.92) 0%, rgba(15,10,5,0.7) 60%, transparent 100%)",
                px: 3,
                pt: 5,
                pb: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: tokens.font.display,
                  fontSize: tokens.fontSize.lg,
                  color: tokens.ui.gold,
                  textAlign: "center",
                  textTransform: "capitalize",
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                {enlargedCard.title}
              </Typography>
              {enlargedCard.description && (
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.sm,
                    color: "rgba(235,225,210,0.9)",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {enlargedCard.description}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Dialog>

      {/* ── Holdings (fills remaining space) ─────────────────────── */}
      <Holdings {...props} variant="compact" />
    </Box>
  );
};
