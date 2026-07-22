/**
 * GameLayout — the stable frame. One layout for every phase and both turn
 * states: top strip / opponent rail + map / prompt bar / dock. Turn and
 * phase changes swap CONTENT (prompt text, overlay visibility), never the
 * frame itself — the map keeps its size and camera at all times.
 */
import { ReactNode, useState } from "react";
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
import { GameButton } from "@/components/atoms/GameButton";
import { useActionHover } from "@/components/ActionBoard/ActionHoverContext";

/** Side-panel tabs (right drawer over the map) */
export type PanelSlot = "game-log" | "stats" | "trade" | "chat";

const MOOD_BACKGROUNDS: Record<string, string> = {
  peacetime: tokens.ui.background,
  discovery: tokens.mood.discovery.bg,
  battle: tokens.mood.battle.bg,
  election: tokens.mood.election.bg,
  crisis: tokens.mood.crisis.bg,
};

/** Width reserved beside the map while the action board is open */
const ACTION_OVERLAY_WIDTH = 560;

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
  /** True during the local player's actions turn — shows the action overlay */
  actionOverlayActive: boolean;
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
  actionOverlayActive,
  renderPanel,
  renderActionBoard,
  renderMap,
  decisionPanel,
  children,
}: GameLayoutProps) => {
  const mood = getMood(group, step);
  const moodBg = MOOD_BACKGROUNDS[mood] ?? MOOD_BACKGROUNDS.peacetime;

  const [openPanel, setOpenPanel] = useState<PanelSlot | null>(null);
  const [overlayDismissed, setOverlayDismissed] = useState(false);

  // A new actions turn re-opens the overlay the player dismissed last turn.
  // State-adjust-during-render: cheaper than an effect, no extra paint.
  const [prevOverlayActive, setPrevOverlayActive] = useState(actionOverlayActive);
  if (prevOverlayActive !== actionOverlayActive) {
    setPrevOverlayActive(actionOverlayActive);
    if (actionOverlayActive) setOverlayDismissed(false);
  }

  // A guide flash (e.g. "build a shipyard first") must be visible — reopen
  // the overlay if the player had dismissed it.
  const { flashedAction } = useActionHover();
  const [prevFlashed, setPrevFlashed] = useState(flashedAction);
  if (prevFlashed !== flashedAction) {
    setPrevFlashed(flashedAction);
    if (flashedAction && actionOverlayActive) setOverlayDismissed(false);
  }

  const overlayVisible = actionOverlayActive && !overlayDismissed;

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
                  onClick={() => setOpenPanel((prev) => (prev === slot ? null : slot))}
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
          {/* The map viewport narrows while the action board is open, so the
              board reserves space beside the map instead of covering tiles. */}
          <Box
            sx={{
              height: "100%",
              width: overlayVisible ? `calc(100% - ${ACTION_OVERLAY_WIDTH}px)` : "100%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              transition: `width ${tokens.transition.normal}`,
            }}
          >
            {renderMap()}
          </Box>

          {/* Action board — right side sheet in the reserved strip */}
          {overlayVisible && (
            <Box
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                bottom: 8,
                width: ACTION_OVERLAY_WIDTH - 16,
                maxWidth: "calc(100% - 16px)",
                display: "flex",
                flexDirection: "column",
                borderRadius: `${tokens.radius.lg}px`,
                border: `1px solid ${tokens.ui.borderMedium}`,
                background: backgrounds.parchmentPanelTinted,
                backgroundColor: tokens.ui.background,
                boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                zIndex: 20,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: `${tokens.spacing.md}px`,
                  py: `${tokens.spacing.xs}px`,
                  borderBottom: `1px solid ${tokens.ui.border}`,
                  flexShrink: 0,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: "6px", color: tokens.ui.gold }}>
                  <GiBarracks size={16} />
                  <Box component="span" sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.sm, fontWeight: 700, letterSpacing: "0.06em" }}>
                    ACTION BOARD
                  </Box>
                </Box>
                <Tooltip title="Hide — peek at the map (reopens from the button below)" placement="left">
                  <Box
                    onClick={() => setOverlayDismissed(true)}
                    sx={{ display: "flex", color: tokens.ui.textMuted, cursor: "pointer", "&:hover": { color: tokens.ui.text } }}
                  >
                    <Close fontSize="small" />
                  </Box>
                </Tooltip>
              </Box>
              <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{renderActionBoard()}</Box>
            </Box>
          )}

          {/* Non-modal decision panels — lower-centre of the map, map stays live */}
          {decisionPanel && (
            <Box
              sx={{
                position: "absolute",
                bottom: 12,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                zIndex: 25,
                pointerEvents: "none",
                "& > *": { pointerEvents: "auto" },
              }}
            >
              {decisionPanel}
            </Box>
          )}

          {/* Restore chip when the overlay is dismissed mid-turn */}
          {actionOverlayActive && overlayDismissed && (
            <GameButton
              variant="primary"
              size="sm"
              onClick={() => setOverlayDismissed(false)}
              sx={{ position: "absolute", bottom: 10, right: 10, zIndex: 20, boxShadow: `0 0 12px ${tokens.ui.gold}55` }}
            >
              ⚔ Action Board
            </GameButton>
          )}

          {/* Side panel drawer — over the map, right edge */}
          {openPanel !== null && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: "min(380px, 85%)",
                display: "flex",
                flexDirection: "column",
                background: backgrounds.parchmentPanelTinted,
                backgroundColor: tokens.ui.surface,
                borderLeft: `1px solid ${tokens.ui.borderMedium}`,
                boxShadow: "-4px 0 16px rgba(0,0,0,0.25)",
                zIndex: 30,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: `${tokens.spacing.md}px`,
                  py: `${tokens.spacing.xs}px`,
                  borderBottom: `1px solid ${tokens.ui.border}`,
                  flexShrink: 0,
                }}
              >
                <Box component="span" sx={{ fontFamily: tokens.font.accent, fontSize: tokens.fontSize.sm, fontWeight: 700, color: tokens.ui.gold, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {PANEL_TABS.find((t) => t.slot === openPanel)?.label}
                </Box>
                <Box
                  onClick={() => setOpenPanel(null)}
                  sx={{ display: "flex", color: tokens.ui.textMuted, cursor: "pointer", "&:hover": { color: tokens.ui.text } }}
                >
                  <Close fontSize="small" />
                </Box>
              </Box>
              <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>{renderPanel(openPanel)}</Box>
            </Box>
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
