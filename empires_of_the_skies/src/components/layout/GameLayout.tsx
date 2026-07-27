/**
 * GameLayout — the stable frame: top strip / rail + map + action column /
 * prompt bar / dock. Nothing appears, disappears, or resizes during play.
 *
 * The action column is permanent furniture, not an overlay. Counsellor
 * placement is a contested shared board — hiding it off-turn hid the
 * contention that drives most of the game's decisions. Off-turn it goes
 * read-only; that's a state change, not a layout change.
 */
import { ReactNode } from "react";
import React from "react";
import { Box, Tooltip } from "@mui/material";
import { Close } from "@mui/icons-material";
import { tokens, backgrounds } from "@/theme";
import { getMood } from "@/theme";
import type { GameStep, PhaseGroup } from "@eots/game";
import {
  GiScrollUnfurled, GiSwapBag, GiConversation, GiBarracks,
} from "react-icons/gi";
import { MdQueryStats } from "react-icons/md";

/** Right drawer contents. "inspect" has no tab — the rail opens it. */
export type PanelSlot = "game-log" | "stats" | "trade" | "chat" | "inspect";

const MOOD_BACKGROUNDS: Record<string, string> = {
  peacetime: tokens.ui.background,
  discovery: tokens.mood.discovery.bg,
  battle: tokens.mood.battle.bg,
  election: tokens.mood.election.bg,
  crisis: tokens.mood.crisis.bg,
};

/** The action column — always present, never resized */
const ACTION_COLUMN_WIDTH = 560;

const PANEL_TABS: { slot: PanelSlot; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { slot: "game-log", label: "Log", Icon: GiScrollUnfurled },
  { slot: "stats", label: "Stats", Icon: MdQueryStats as React.ComponentType<{ size?: number }> },
  { slot: "trade", label: "Trade", Icon: GiSwapBag },
  { slot: "chat", label: "Chat", Icon: GiConversation },
];

interface GameLayoutProps {
  /** Current phase group and step drive mood styling only, never structure. */
  group: PhaseGroup;
  step: GameStep;
  topStrip: ReactNode;
  opponentRail: ReactNode;
  promptBar: ReactNode;
  dock: ReactNode;
  /** True during the local player's actions turn — the column accepts input */
  actionsInteractive: boolean;
  /** Controlled: the rail opens "inspect" from outside the frame */
  openPanel: PanelSlot | null;
  onOpenPanel: (slot: PanelSlot | null) => void;
  /** Drawer heading — lets "inspect" name the kingdom being read */
  panelTitle?: string;
  renderPanel: (slot: PanelSlot) => ReactNode;
  renderActionBoard: () => ReactNode;
  renderMap: () => ReactNode;
  /** Non-modal decision panels — float over the map's lower edge */
  decisionPanel?: ReactNode;
  /** Floating children (dialogs) */
  children?: ReactNode;
}

export const GameLayout = ({
  group,
  step,
  topStrip,
  opponentRail,
  promptBar,
  dock,
  actionsInteractive,
  openPanel,
  onOpenPanel,
  panelTitle,
  renderPanel,
  renderActionBoard,
  renderMap,
  decisionPanel,
  children,
}: GameLayoutProps) => {
  const mood = getMood(group, step);
  const moodBg = MOOD_BACKGROUNDS[mood] ?? MOOD_BACKGROUNDS.peacetime;

  return (
    <Box
      className="game-layout-root"
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
        height: "100%",
        backgroundColor: moodBg,
        backgroundImage: `${backgrounds.riverTexture}`.replace("center / cover no-repeat", "center / cover"),
        backgroundBlendMode: "soft-light",
        transition: `background-color ${tokens.transition.slow}`,
      }}
    >
      {/* Top strip + panel tab icons */}
      <Box sx={{ display: "flex", alignItems: "stretch", flexShrink: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{topStrip}</Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            px: `${tokens.spacing.md}px`,
            background: backgrounds.leatherBar,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -6px 12px rgba(0,0,0,0.35)",
            borderBottom: `2px solid rgba(200,170,120,0.2)`,
            borderLeft: `1px solid rgba(200,170,120,0.25)`,
          }}
        >
          {PANEL_TABS.map(({ slot, label, Icon }) => {
            const isActive = openPanel === slot;
            return (
              <Tooltip key={slot} title={label} placement="bottom" arrow>
                <Box
                  onClick={() => onOpenPanel(openPanel === slot ? null : slot)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 28,
                    borderRadius: `${tokens.radius.sm}px`,
                    cursor: "pointer",
                    color: isActive ? "#E8C860" : "#C8B898",
                    backgroundColor: isActive ? "rgba(232,200,96,0.12)" : "transparent",
                    borderBottom: isActive ? `2px solid #E8C860` : "2px solid transparent",
                    transition: `all ${tokens.transition.fast}`,
                    "&:hover": { color: "#F5ECD8", backgroundColor: "rgba(232,200,96,0.08)" },
                  }}
                >
                  <Icon size={16} />
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Rail + map row */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        {opponentRail}

        {/* Map area — the permanent centre */}
        <Box
          sx={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            backgroundColor: `${tokens.ui.background}`,
          }}
        >
          <Box sx={{ height: "100%", width: "100%", minWidth: 0, display: "flex", flexDirection: "column" }}>
            {renderMap()}
          </Box>
        </Box>

        {/* The right region — ONE panel, never an overlay. The board lives here
            by default; Log/Stats/Trade/Chat/Inspect take the same slot when
            opened. Nothing is ever allowed to cover the map. */}
        <Box
          sx={{
            width: ACTION_COLUMN_WIDTH,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderLeft: `1px solid ${tokens.ui.borderMedium}`,
            ...backgrounds.panelSurface,
            boxShadow: "inset 10px 0 14px -10px rgba(0,0,0,0.35)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: `${tokens.spacing.sm}px`,
              px: `${tokens.spacing.md}px`,
              py: `${tokens.spacing.xs}px`,
              borderBottom: `1px solid ${tokens.ui.borderMedium}`,
              background: backgrounds.leatherBar,
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px", color: "#E8C860", minWidth: 0 }}>
              {openPanel === null && <GiBarracks size={16} />}
              <Box component="span" sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.sm, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {openPanel === null
                  ? "Action Board"
                  : panelTitle ?? PANEL_TABS.find((t) => t.slot === openPanel)?.label}
              </Box>
            </Box>
            {openPanel !== null ? (
              <Tooltip title="Back to the board" placement="left" arrow>
                <Box
                  onClick={() => onOpenPanel(null)}
                  sx={{ display: "flex", color: "#C8B898", cursor: "pointer", flexShrink: 0, "&:hover": { color: "#F5ECD8" } }}
                >
                  <Close fontSize="small" />
                </Box>
              </Tooltip>
            ) : !actionsInteractive ? (
              <Tooltip title="You can read the board any time — placements open up on your turn" placement="left" arrow>
                <Box
                  component="span"
                  sx={{
                    fontFamily: tokens.font.body,
                    fontSize: tokens.fontSize.xs,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#C8B898",
                    border: "1px solid rgba(200,170,120,0.4)",
                    borderRadius: `${tokens.radius.sm}px`,
                    px: "6px",
                    py: "1px",
                    flexShrink: 0,
                    cursor: "default",
                  }}
                >
                  Watching
                </Box>
              </Tooltip>
            ) : null}
          </Box>

          {/* Whatever the game is waiting on, pinned above whatever else the
              column is showing. Deliberately OUTSIDE the panel check: a
              combat or event decision is mandatory, and hiding it behind an
              open Log/Stats panel stalls the game with no way to see why.
              Renders nothing when no decision is live. */}
          {decisionPanel && (
            <Box sx={{ flexShrink: 0, px: `${tokens.spacing.sm}px`, "&:not(:empty)": { pt: `${tokens.spacing.sm}px` } }}>
              {decisionPanel}
            </Box>
          )}

          {openPanel !== null && (
            <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{renderPanel(openPanel)}</Box>
          )}

          {openPanel === null && (
            <>
              {/* Only the BOARD goes read-only off-turn — a live decision sits
                  above it and must stay clickable. Clicks are swallowed at the
                  boundary rather than disabled per-row, so hover and tooltips
                  still work: off-turn, the board is for reading. */}
              <Box
                onClickCapture={(e) => {
                  if (!actionsInteractive) {
                    e.stopPropagation();
                    e.preventDefault();
                  }
                }}
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                  opacity: actionsInteractive ? 1 : 0.78,
                  filter: actionsInteractive ? "none" : "saturate(0.72)",
                  transition: `opacity ${tokens.transition.normal}, filter ${tokens.transition.normal}`,
                }}
              >
                {renderActionBoard()}
              </Box>
            </>
          )}
        </Box>
      </Box>

      {promptBar}
      {dock}

      {/* Floating / dialog children */}
      {children}
    </Box>
  );
};
