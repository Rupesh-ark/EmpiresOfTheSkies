/**
 * PlayerBoardCompact — Kingdom Dashboard card.
 *
 * Used in all visible non-actions phases (events, discovery, battles,
 * election, resolution). Styled like a physical board game reference card
 * with sectioned layout: Treasury, Forces, Fleets, Cards.
 *
 * Read-only. No interactions.
 */
import { Box, Typography } from "@mui/material";
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
import type { PlayerFortuneOfWarCardInfo } from "@eots/game";
import { Holdings } from "./Holdings";

interface PlayerBoardCompactProps extends MyGameProps {
  onOpenFleetLocation?: (location: number[]) => void;
  showFoWCards?: boolean;
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

export const PlayerBoardCompact = (props: PlayerBoardCompactProps) => {
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
        {props.showFoWCards ? (
          <Box>
            <Box
              sx={{
                display: "flex",
                gap: `${tokens.spacing.xs}px`,
                flexWrap: "wrap",
              }}
            >
              {fortuneCards.map((card, i) => (
                <CardFrame
                  key={i}
                  title={!card.flipped ? undefined : card.name}
                  description={
                    !card.flipped ? undefined : `⚔ ${card.sword}  🛡 ${card.shield}`
                  }
                  imageUrl={getFoWCardImage(card)}
                  faceDown={!card.flipped}
                  cardBackUrl={FOW_CARD_BACK}
                  width={70}
                  height={120}
                />
              ))}
              {fortuneCards.length === 0 && (
                <Typography
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.xs,
                    color: tokens.ui.textMuted,
                    fontStyle: "italic",
                  }}
                >
                  No FoW cards
                </Typography>
              )}
            </Box>
            <Typography
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.xs,
                color: tokens.ui.textMuted,
                mt: `${tokens.spacing.xs}px`,
              }}
            >
              Legacy: {playerInfo.resources.legacyCard ? 1 : 0} · KA: {playerInfo.resources.advantageCard ? 1 : 0}
            </Typography>
          </Box>
        ) : (
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.textMuted,
            }}
          >
            {fortuneCards.length} FoW · {playerInfo.resources.legacyCard ? 1 : 0} Legacy · {playerInfo.resources.advantageCard ? 1 : 0} KA
          </Typography>
        )}
      </GamePanel>

      {/* ── Holdings (fills remaining space) ─────────────────────── */}
      <Holdings {...props} variant="compact" />
    </Box>
  );
};
