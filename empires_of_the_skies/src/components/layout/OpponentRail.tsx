/**
 * OpponentRail — standings, and nothing else. One chip per kingdom, you
 * first; clicking one opens that kingdom in the drawer.
 *
 * Deep inspection used to live here too, which made an always-on column do
 * an on-demand job and squeezed the comparison it exists for. The rail now
 * never changes shape. Collapsible to a strip of colour medallions.
 */
import { useState } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { MyGameProps } from "@eots/game";
import { tokens, backgrounds } from "@/theme";
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

/**
 * The kingdom's enamel pin in a brass ring — one object for every place a
 * player is identified: collapsed rail, expanded plate, heresy track. Gaining
 * a name beside it is the only difference between collapsed and expanded.
 */
const KingdomPin = ({
  colour,
  initial,
  size,
  ringed = false,
  pulsing = false,
}: {
  colour: string;
  initial: string;
  size: number;
  ringed?: boolean;
  pulsing?: boolean;
}) => (
  <Box
    sx={{
      width: size,
      height: size,
      p: "2px",
      borderRadius: "50%",
      flexShrink: 0,
      background: ringed ? `linear-gradient(180deg, ${tokens.ui.gold}, #8a6d34)` : backgrounds.brassBezel,
      boxShadow: "0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
      ...(pulsing && {
        "@keyframes pinPulse": {
          "0%, 100%": { boxShadow: `0 1px 3px rgba(0,0,0,0.5), 0 0 4px ${colour}66` },
          "50%": { boxShadow: `0 1px 3px rgba(0,0,0,0.5), 0 0 14px ${colour}` },
        },
        animation: "pinPulse 2s ease-in-out infinite",
      }),
    }}
  >
    <Box
      sx={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        border: "1px solid rgba(0,0,0,0.45)",
        background: backgrounds.enamel(colour),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography
        component="span"
        sx={{
          fontFamily: tokens.font.accent,
          fontSize: Math.round(size * 0.42),
          fontWeight: 800,
          lineHeight: 1,
          color: isLightColour(colour) ? "rgba(40,28,14,0.9)" : "rgba(255,252,245,0.95)",
          textShadow: isLightColour(colour) ? "0 1px 1px rgba(255,255,255,0.4)" : "0 1px 2px rgba(0,0,0,0.6)",
          userSelect: "none",
        }}
      >
        {initial}
      </Typography>
    </Box>
  </Box>
);

export const OpponentRail = (props: OpponentRailProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const me = props.playerID;
  const ids = Object.keys(props.G.playerInfo);
  // Own kingdom first, then table order.
  const ordered = me ? [me, ...ids.filter((id) => id !== me)] : ids;

  return (
    <Box
      sx={{
        width: collapsed ? 48 : 180,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        p: "6px",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        // Leather, like the strip and prompt bar: material encodes role, and
        // the rail is frame. Parchment is reserved for content (map surround,
        // action column, dock), which is what separates the zones now.
        background: backgrounds.leatherBar,
        borderRight: `1px solid rgba(200,170,120,0.28)`,
        boxShadow: "inset -10px 0 14px -10px rgba(0,0,0,0.5)",
        transition: `width ${tokens.transition.normal}`,
      }}
    >
      <Box
        onClick={() => setCollapsed((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-end",
          color: "#C8B898",
          cursor: "pointer",
          flexShrink: 0,
          "&:hover": { color: "#F5ECD8" },
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
              <Box onClick={() => props.onSelectPlayer(id)} sx={{ mx: "auto", cursor: "pointer" }}>
                <KingdomPin colour={p.colour} initial={p.kingdomName[0]} size={34} ringed={isViewed} pulsing={isActing} />
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
              // A scoreboard plate, not a paper card — the rail is leather now.
              // Identity is carried by the enamel pin, not an edge stripe: the
              // same object the collapsed rail and the heresy track use.
              background: "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.18) 100%)",
              border: isViewed ? `1px solid ${tokens.ui.gold}` : "1px solid rgba(200,170,120,0.22)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
              cursor: "pointer",
              flexShrink: 0,
              transition: `all ${tokens.transition.fast}`,
              "&:hover": { borderColor: `${tokens.ui.gold}99`, background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.14) 100%)" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <KingdomPin colour={p.colour} initial={p.kingdomName[0]} size={22} ringed={isViewed} pulsing={isActing} />
              <Typography noWrap sx={{ fontFamily: tokens.font.display, fontSize: tokens.fontSize.xs, fontWeight: 700, color: "#F5ECD8", lineHeight: 1.1, flex: 1 }}>
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
                {/* Allegiance tokens are tuned for AA on parchment; on leather
                    they need the lifted variants to stay legible. */}
                <Typography sx={{ fontSize: tokens.fontSize.xs, fontFamily: tokens.font.body, fontWeight: 700, lineHeight: 1, flexShrink: 0, color: p.hereticOrOrthodox === "heretic" ? "#E8A44A" : "#C98ED4" }}>
                  {p.hereticOrOrthodox === "heretic" ? "H" : "O"}{" "}
                  {(p.hereticOrOrthodox === "heretic" ? p.heresyTracker : -p.heresyTracker) >= 0 ? "+" : ""}
                  {p.hereticOrOrthodox === "heretic" ? p.heresyTracker : -p.heresyTracker}
                </Typography>
              </Tooltip>
            </Box>
            <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: "#A89878", lineHeight: 1 }}>
              {isMe ? "you" : name ?? "—"}
            </Typography>

            {/* Standings, in words — who's winning, who can outspend */}
            <Box sx={{ display: "flex", alignItems: "baseline", gap: "5px", minWidth: 0 }}>
              <Typography sx={{ fontFamily: tokens.font.display, fontSize: 16, fontWeight: 800, color: "#E8C860", lineHeight: 1 }}>
                {p.resources.victoryPoints}
              </Typography>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, fontWeight: 600, color: "#E8C860", lineHeight: 1 }}>
                VP
              </Typography>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: p.resources.gold < 0 ? "#E8776A" : "#D8CBAE", lineHeight: 1, ml: "4px" }}>
                {p.resources.gold} gold
              </Typography>
            </Box>
            {/* Military threat, in words */}
            <Typography noWrap sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: "#A89878", lineHeight: 1 }}>
              {p.resources.regiments + (p.resources.eliteRegiments ?? 0)} troops · {p.resources.skyships} skyships
            </Typography>
          </Box>
        );
      })}

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
