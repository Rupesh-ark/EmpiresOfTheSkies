/**
 * PlayerBoardCompact — used in all visible non-actions phases.
 *
 * Two variants controlled by props:
 *   - Standard (events, discovery, election): force chips + fleet list + card counts
 *   - FoW expanded (battles, resolution): same but FoW cards shown as CardFrame atoms
 *
 * Read-only. No interactions.
 */
import { Box, Typography } from "@mui/material";
import { tokens } from "@/theme";
import { MyGameProps } from "@eots/game";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import { CardFrame } from "@/components/atoms/CardFrame";
import { getLocationPresentation } from "@/utils/locationLabels";
import {
  SWORD_CARDS,
  SHIELD_CARDS,
  NO_EFFECT_CARD,
  FOW_CARD_BACK,
} from "@/assets/fortuneOfWarCards";
import type { PlayerFortuneOfWarCardInfo } from "@eots/game";

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

// ── Brass divider (same as Full mode) ───────────────────────────────────

const CompactDivider = () => (
  <Box
    sx={{
      height: "1px",
      background: `linear-gradient(90deg, ${tokens.ui.gold}44, transparent)`,
      my: `${tokens.spacing.xs}px`,
    }}
  />
);

export const PlayerBoardCompact = (props: PlayerBoardCompactProps) => {
  const playerInfo = props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const colour = playerInfo.colour;
  const { regiments, eliteRegiments, levies, skyships, fortuneCards } = playerInfo.resources;
  const gold = playerInfo.resources.gold;
  const vp = playerInfo.resources.victoryPoints;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: `${tokens.spacing.xs}px`,
        p: `${tokens.spacing.md}px`,
        borderTop: `3px solid ${colour}`,
      }}
    >
      {/* Kingdom name */}
      <Box sx={{ display: "flex", alignItems: "center", gap: `${tokens.spacing.sm}px` }}>
        <Box
          sx={{
            width: 8,
            height: 8,
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

      {/* Heresy (election only) */}
      {props.showHeresy && (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: `${tokens.spacing.xs}px`,
            px: `${tokens.spacing.sm}px`,
            py: `${tokens.spacing.xs}px`,
            borderRadius: `${tokens.radius.sm}px`,
            backgroundColor:
              playerInfo.hereticOrOrthodox === "heretic"
                ? `${tokens.allegiance.heresy}15`
                : `${tokens.allegiance.orthodox}15`,
            border: `1px solid ${
              playerInfo.hereticOrOrthodox === "heretic"
                ? `${tokens.allegiance.heresy}33`
                : `${tokens.allegiance.orthodox}33`
            }`,
          }}
        >
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.sm,
              color:
                playerInfo.hereticOrOrthodox === "heretic"
                  ? tokens.allegiance.heresy
                  : tokens.allegiance.orthodox,
              fontWeight: 600,
            }}
          >
            {playerInfo.hereticOrOrthodox === "heretic" ? "⚠ Heretic" : "✦ Orthodox"}
            {" · "}Heresy: {playerInfo.heresyTracker}
          </Typography>
        </Box>
      )}

      <CompactDivider />

      {/* Force counts */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: `${tokens.spacing.xs}px` }}>
        {[
          { icon: "⚔", value: regiments },
          { icon: "🎖", value: eliteRegiments ?? 0 },
          { icon: "🛡", value: levies },
          { icon: "🚢", value: skyships },
          { icon: "💰", value: gold },
          { icon: "⭐", value: vp },
        ].map((f, i) => (
          <ResourceChip
            key={i}
            icon={<span>{f.icon}</span>}
            value={f.value}
            size="sm"
            variant={f.value === 0 ? "muted" : "default"}
          />
        ))}
      </Box>

      <CompactDivider />

      {/* Fleet list */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {playerInfo.fleetInfo.map((fleet, i) => {
          const loc = getLocationPresentation(
            props.G.mapState.currentTileArray,
            fleet.location
          );
          return (
            <Typography
              key={fleet.fleetId}
              sx={{
                fontFamily: tokens.font.body,
                fontSize: tokens.fontSize.xs,
                color: tokens.ui.textMuted,
                lineHeight: 1.5,
              }}
            >
              Fleet {i + 1}: {loc.name} [{loc.reference}] {fleet.skyships}🚢
            </Typography>
          );
        })}
      </Box>

      <CompactDivider />

      {/* FoW cards or card counts */}
      {props.showFoWCards ? (
        <Box>
          <Typography
            sx={{
              fontFamily: tokens.font.accent,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.gold,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              mb: `${tokens.spacing.xs}px`,
            }}
          >
            FoW Cards
          </Typography>
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
          Cards: {fortuneCards.length} FoW · {playerInfo.resources.legacyCard ? 1 : 0} Legacy · {playerInfo.resources.advantageCard ? 1 : 0} KA
        </Typography>
      )}
    </Box>
  );
};
