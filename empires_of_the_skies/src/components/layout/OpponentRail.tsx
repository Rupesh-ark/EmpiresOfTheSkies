/**
 * OpponentRail — the reference column on the left edge. Player standings
 * chips (you first; clicking one inspects that player), then the inspected
 * player's Holdings and Forces, then the game emblem as a foot ornament.
 * Collapsible to a strip of colour medallions.
 */
import { useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { MyGameProps } from "@eots/game";
import { tokens, backgrounds } from "@/theme";
import { IconRegiment, IconElite, IconLevy, IconSkyship } from "@/theme";
import { Holdings } from "@/components/PlayerBoard/Holdings";
import { ResourceChip } from "@/components/atoms/ResourceChip";
import emblem from "@/boards_and_assets/branding/box_art_logo.webp";
import popeLogo from "@/boards_and_assets/action_board/pope_logo.webp";
import captainGeneralLogo from "@/boards_and_assets/action_board/captain_general.webp";

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
        width: collapsed ? 48 : 216,
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
              </Typography>
              {p.isArchprelate && (
                <Tooltip title="Seat of the Archprelate" placement="right" arrow>
                  <Box component="img" src={popeLogo} alt="Archprelate" sx={{ width: 15, height: 15, objectFit: "contain", opacity: 0.85, flexShrink: 0 }} />
                </Tooltip>
              )}
              {p.isCaptainGeneral && (
                <Tooltip title="Captain-General of the Faith" placement="right" arrow>
                  <Box component="img" src={captainGeneralLogo} alt="Captain-General" sx={{ width: 15, height: 15, objectFit: "contain", opacity: 0.85, flexShrink: 0 }} />
                </Tooltip>
              )}
              <Tooltip
                title={`${p.hereticOrOrthodox === "heretic" ? "Heretic" : "Orthodox"} — heresy position worth ${(p.hereticOrOrthodox === "heretic" ? p.heresyTracker : -p.heresyTracker) > 0 ? "+" : ""}${p.hereticOrOrthodox === "heretic" ? p.heresyTracker : -p.heresyTracker} VP at game end`}
                placement="right"
                arrow
              >
                <Typography sx={{ fontSize: tokens.fontSize.xs, fontFamily: tokens.font.body, fontWeight: 700, lineHeight: 1, flexShrink: 0, color: p.hereticOrOrthodox === "heretic" ? tokens.allegiance.heresy : tokens.allegiance.orthodox }}>
                  {p.hereticOrOrthodox === "heretic" ? "H" : "O"}{" "}
                  {(p.hereticOrOrthodox === "heretic" ? p.heresyTracker : -p.heresyTracker) >= 0 ? "+" : ""}
                  {p.hereticOrOrthodox === "heretic" ? p.heresyTracker : -p.heresyTracker}
                </Typography>
              </Tooltip>
            </Box>
            <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1 }}>
              {isMe ? "you" : name ?? "—"}
            </Typography>

            {/* Standings, in words — who's winning, who can outspend */}
            <Box sx={{ display: "flex", alignItems: "baseline", gap: "5px", minWidth: 0 }}>
              <Typography sx={{ fontFamily: tokens.font.display, fontSize: 15, fontWeight: 800, color: tokens.ui.gold, lineHeight: 1 }}>
                {p.resources.victoryPoints}
              </Typography>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: tokens.ui.gold, lineHeight: 1 }}>
                VP
              </Typography>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: p.resources.gold < 0 ? tokens.ui.danger : tokens.ui.text, lineHeight: 1, ml: "4px" }}>
                {p.resources.gold} gold
              </Typography>
            </Box>
            {/* Military threat, in words */}
            <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, lineHeight: 1 }}>
              {p.resources.regiments + (p.resources.eliteRegiments ?? 0)} troops · {p.resources.skyships} skyships
            </Typography>
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

      {!collapsed && (() => {
        const viewed = props.G.playerInfo[props.viewPlayerID];
        if (!viewed) return null;
        const inspectingOther = props.viewPlayerID !== props.playerID;
        return (
          <Box sx={{ px: `${tokens.spacing.sm}px`, display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            {inspectingOther && (
              <Typography sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.xs, fontWeight: 700, color: viewed.colour, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1, textShadow: "0 1px 1px rgba(0,0,0,0.2)" }}>
                Inspecting {viewed.kingdomName}
              </Typography>
            )}
            <Box>
              <RailSectionHeader label="Forces" />
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                <ForceChip Icon={IconRegiment} value={viewed.resources.regiments} label="Regiments" />
                <ForceChip Icon={IconElite} value={viewed.resources.eliteRegiments ?? 0} label="Elite" />
                <ForceChip Icon={IconLevy} value={viewed.resources.levies} label="Levies" />
                <ForceChip Icon={IconSkyship} value={viewed.resources.skyships} label="Skyships" />
              </Box>
            </Box>
            <Box>
              <RailSectionHeader label="Holdings" />
              <Holdings {...props} variant="compact" bare viewPlayerID={props.viewPlayerID} />
            </Box>
          </Box>
        );
      })()}

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



const RailSectionHeader = ({ label }: { label: string }) => (
  <Typography
    sx={{
      fontFamily: tokens.font.accent,
      fontSize: tokens.fontSize.xs,
      fontWeight: 700,
      color: tokens.ui.gold,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      lineHeight: 1,
      mb: "5px",
    }}
  >
    {label}
  </Typography>
);

const ForceChip = ({
  Icon,
  value,
  label,
}: {
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
  value: number;
  label: string;
}) => (
  <ResourceChip
    icon={<Icon style={{ fontSize: 15 }} />}
    value={value}
    label={label}
    size="sm"
    variant={value === 0 ? "muted" : "default"}
  />
);
