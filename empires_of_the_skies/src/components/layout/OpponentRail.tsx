/**
 * OpponentRail — always-visible player summary chips on the left edge.
 * Every player gets a chip (you first); clicking one swaps that player's
 * board into the dock. Below the chips, the rail carries the round
 * timeline — which phase we're in and what's coming — and the game
 * emblem as a foot ornament. Collapsible to a strip of colour dots.
 */
import { useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { MyGameProps, GAME_PHASES } from "@eots/game";
import { tokens, backgrounds } from "@/theme";
import { IconGold, IconVP } from "@/theme";
import { GiZeppelin, GiCrossedSwords } from "react-icons/gi";
import emblem from "@/boards_and_assets/branding/box_art_logo.webp";

interface OpponentRailProps extends MyGameProps {
  viewPlayerID: string;
  onSelectPlayer: (playerID: string) => void;
}

/** Light kingdom colours (cream, yellow) need dark stamp text. */
const isLightColour = (hex: string): boolean => {
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
};

export const OpponentRail = (props: OpponentRailProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const me = props.playerID;
  const ids = Object.keys(props.G.playerInfo);
  // Own kingdom first, then table order.
  const ordered = me ? [me, ...ids.filter((id) => id !== me)] : ids;

  return (
    <Box
      sx={{
        width: collapsed ? 48 : 176,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        p: "6px",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        background: backgrounds.parchmentPanelTinted,
        backgroundColor: tokens.ui.surface,
        borderRight: `1px solid rgba(160,120,60,0.35)`,
        boxShadow: "inset -8px 0 12px -8px rgba(0,0,0,0.25)",
        transition: `width ${tokens.transition.normal}`,
      }}
    >
      <Box
        onClick={() => setCollapsed((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-end",
          color: tokens.ui.textMuted,
          cursor: "pointer",
          flexShrink: 0,
          "&:hover": { color: tokens.ui.text },
        }}
      >
        {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
      </Box>

      {ordered.map((id) => {
        const p = props.G.playerInfo[id];
        if (!p) return null;
        const isActing = props.ctx.currentPlayer === id;
        const isViewed = props.viewPlayerID === id;
        const isMe = me === id;
        const name = props.matchData?.find((m) => String(m.id) === id)?.name;

        if (collapsed) {
          return (
            <Tooltip key={id} title={`${p.kingdomName}${isMe ? " (you)" : ""} — ${p.resources.victoryPoints} VP`} placement="right" arrow>
              {/* Enamel medallion in a brass ring, stamped with the kingdom initial */}
              <Box
                onClick={() => props.onSelectPlayer(id)}
                sx={{
                  width: 34,
                  height: 34,
                  mx: "auto",
                  p: "2px",
                  borderRadius: "50%",
                  background: isViewed
                    ? `linear-gradient(180deg, ${tokens.ui.gold}, #8a6d34)`
                    : backgrounds.brassBezel,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                  cursor: "pointer",
                  flexShrink: 0,
                  ...(isActing && {
                    "@keyframes railDotPulse": {
                      "0%, 100%": { boxShadow: `0 1px 3px rgba(0,0,0,0.5), 0 0 4px ${p.colour}66` },
                      "50%": { boxShadow: `0 1px 3px rgba(0,0,0,0.5), 0 0 14px ${p.colour}` },
                    },
                    animation: "railDotPulse 2s ease-in-out infinite",
                  }),
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    border: "1px solid rgba(0,0,0,0.45)",
                    background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,0.75) 0%, ${p.colour} 46%, rgba(0,0,0,0.35) 135%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: tokens.font.accent,
                      fontSize: 13,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: isLightColour(p.colour) ? "rgba(40,28,14,0.85)" : "rgba(255,252,245,0.95)",
                      textShadow: isLightColour(p.colour)
                        ? "0 1px 1px rgba(255,255,255,0.4)"
                        : "0 1px 2px rgba(0,0,0,0.6)",
                      userSelect: "none",
                    }}
                  >
                    {p.kingdomName[0]}
                  </Typography>
                </Box>
              </Box>
            </Tooltip>
          );
        }

        return (
          <Box
            key={id}
            onClick={() => props.onSelectPlayer(id)}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              p: `${tokens.spacing.sm}px`,
              borderRadius: `${tokens.radius.md}px`,
              background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
              border: isViewed ? `1px solid ${tokens.ui.gold}88` : `1px solid ${tokens.ui.border}`,
              borderLeft: `4px solid ${p.colour}`,
              cursor: "pointer",
              flexShrink: 0,
              transition: `all ${tokens.transition.fast}`,
              "&:hover": { borderColor: `${tokens.ui.gold}66`, backgroundColor: tokens.ui.surfaceHover },
              ...(isActing && {
                "@keyframes railChipPulse": {
                  "0%, 100%": { boxShadow: `0 0 0 rgba(0,0,0,0)` },
                  "50%": { boxShadow: `0 0 10px ${p.colour}88` },
                },
                animation: "railChipPulse 2s ease-in-out infinite",
              }),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
              <Typography noWrap sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, fontWeight: 700, color: tokens.ui.text, lineHeight: 1.1, flex: 1 }}>
                {p.kingdomName}
                {isMe ? " (you)" : ""}
              </Typography>
              <Typography sx={{ fontSize: tokens.fontSize.xs, fontFamily: tokens.font.body, fontWeight: 700, lineHeight: 1, color: p.hereticOrOrthodox === "heretic" ? tokens.allegiance.heresy : tokens.allegiance.orthodox }}>
                {p.hereticOrOrthodox === "heretic" ? "H" : "O"}
              </Typography>
            </Box>
            {name && !isMe && (
              <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1 }}>
                {name}
              </Typography>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Stat icon={<IconVP style={{ fontSize: 13, color: tokens.ui.gold }} />} value={p.resources.victoryPoints} />
              <Stat icon={<IconGold style={{ fontSize: 13, color: p.resources.gold < 0 ? tokens.ui.danger : tokens.ui.gold }} />} value={p.resources.gold} />
              <Stat icon={<GiZeppelin size={13} color={tokens.ui.textMuted} />} value={p.resources.skyships} />
              <Stat icon={<GiCrossedSwords size={12} color={tokens.ui.textMuted} />} value={p.resources.regiments + (p.resources.eliteRegiments ?? 0)} />
            </Box>
          </Box>
        );
      })}

      {/* Brass divider */}
      <Box
        sx={{
          height: "1px",
          mx: collapsed ? "4px" : `${tokens.spacing.sm}px`,
          my: "4px",
          flexShrink: 0,
          background: `linear-gradient(90deg, transparent, ${tokens.ui.gold}66, transparent)`,
        }}
      />

      <RoundTimeline stage={props.G.stage} collapsed={collapsed} />

      {/* Foot ornament — the game emblem, engraved into the parchment */}
      {!collapsed && (
        <Box
          component="img"
          src={emblem}
          alt=""
          sx={{
            mt: "auto",
            mb: "2px",
            alignSelf: "center",
            width: 128,
            opacity: 0.16,
            filter: "sepia(0.4) contrast(0.9)",
            pointerEvents: "none",
            flexShrink: 0,
          }}
        />
      )}
    </Box>
  );
};

/** Vertical phase tracker — where the round stands and what comes next. */
const RoundTimeline = ({
  stage,
  collapsed,
}: {
  stage: MyGameProps["G"]["stage"];
  collapsed: boolean;
}) => {
  // Hide setup once the game is under way.
  const phases = GAME_PHASES.filter((p) => p.key !== "setup" || stage.phase === "setup");
  const currentIdx = phases.findIndex((p) => p.key === stage.phase);

  if (collapsed) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          mx: "auto",
          px: "8px",
          py: "10px",
          borderRadius: `${tokens.radius.pill}px`,
          // Recessed groove — same instrument language as the heresy gauge
          backgroundColor: "rgba(60,40,20,0.12)",
          border: `1px solid ${tokens.ui.border}`,
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.25), inset 0 -1px 0 rgba(255,255,255,0.3)",
        }}
      >
        {phases.map((p, i) => (
          <Tooltip key={p.key} title={`${p.label}${i === currentIdx ? " — now" : ""}`} placement="right" arrow>
            <Box
              sx={{
                width: i === currentIdx ? 10 : 6,
                height: i === currentIdx ? 10 : 6,
                borderRadius: "50%",
                background:
                  i === currentIdx
                    ? `radial-gradient(circle at 34% 28%, #ffe9a8, ${tokens.ui.gold} 60%)`
                    : i < currentIdx
                      ? `${tokens.ui.gold}66`
                      : "transparent",
                border: i > currentIdx ? `1px solid ${tokens.ui.borderMedium}` : i === currentIdx ? "1px solid rgba(0,0,0,0.3)" : "none",
                boxShadow: i === currentIdx ? `0 0 6px ${tokens.ui.gold}aa` : "none",
              }}
            />
          </Tooltip>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ px: `${tokens.spacing.sm}px`, flexShrink: 0 }}>
      <Typography
        sx={{
          fontFamily: tokens.font.accent,
          fontSize: tokens.fontSize.xs,
          fontWeight: 700,
          color: tokens.ui.gold,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          lineHeight: 1,
          mb: "6px",
        }}
      >
        The Round
      </Typography>
      {phases.map((p, i) => {
        const isCurrent = i === currentIdx;
        const isPast = i < currentIdx;
        return (
          <Tooltip key={p.key} title={p.hint} placement="right" arrow enterDelay={500}>
            <Box sx={{ display: "flex", gap: "8px", cursor: "default" }}>
              {/* Node + connecting line */}
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: isCurrent ? 10 : 7,
                    height: isCurrent ? 10 : 7,
                    mt: isCurrent ? "2px" : "4px",
                    borderRadius: "50%",
                    backgroundColor: isCurrent ? tokens.ui.gold : isPast ? `${tokens.ui.gold}66` : "transparent",
                    border: !isCurrent && !isPast ? `1.5px solid ${tokens.ui.borderMedium}` : "none",
                    boxShadow: isCurrent ? `0 0 8px ${tokens.ui.gold}aa` : "none",
                    flexShrink: 0,
                    ...(isCurrent && {
                      "@keyframes phaseGlow": {
                        "0%, 100%": { boxShadow: `0 0 4px ${tokens.ui.gold}66` },
                        "50%": { boxShadow: `0 0 10px ${tokens.ui.gold}` },
                      },
                      animation: "phaseGlow 2.5s ease-in-out infinite",
                    }),
                  }}
                />
                {i < phases.length - 1 && (
                  <Box sx={{ width: "1px", flex: 1, minHeight: 8, backgroundColor: isPast ? `${tokens.ui.gold}44` : tokens.ui.border }} />
                )}
              </Box>
              <Typography
                sx={{
                  fontFamily: tokens.font.body,
                  fontSize: tokens.fontSize.xs,
                  fontWeight: isCurrent ? 700 : 400,
                  color: isCurrent ? tokens.ui.text : isPast ? `${tokens.ui.textMuted}aa` : tokens.ui.textMuted,
                  lineHeight: 1,
                  pb: "11px",
                }}
              >
                {p.label}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

const Stat = ({ icon, value }: { icon: React.ReactNode; value: number }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
    {icon}
    <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.ui.text, lineHeight: 1 }}>
      {value}
    </Typography>
  </Box>
);
